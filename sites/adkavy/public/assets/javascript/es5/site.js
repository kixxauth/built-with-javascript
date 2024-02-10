(function encloseAdkAvy() {
    'use strict';

    function mapNodes(list, fn) {
        var returnList = [];

        for (var i = 0; i < list.length; i += 1) {
            returnList.push(fn(list[i], i));
        }

        return returnList;
    }

    function extendObject(target, source) {
        Object.keys(source).forEach(function eachKey(key) {
            target[key] = source[key];
        });

        return target;
    }

    function padNumber(n) {
        return ('00' + n).slice(-2);
    }

    function dateToISOTZString(date) {
        var tzo = -date.getTimezoneOffset();
        var dif = tzo >= 0 ? '+' : '-';

        return date.getFullYear()
            + '-' + padNumber(date.getMonth() + 1)
            + '-' + padNumber(date.getDate())
            + 'T' + padNumber(date.getHours())
            + ':' + padNumber(date.getMinutes())
            + ':' + padNumber(date.getSeconds())
            + dif + padNumber(Math.floor(Math.abs(tzo) / 60))
            + ':' + padNumber(Math.abs(tzo) % 60);
    }

    function showAlert(el, timeout) {
        el.classList.add('alert--active');

        if (timeout) {
            setTimeout(function hideAlert() {
                el.classList.remove('alert--active');
            }, timeout);
        }
    }

    function updateOrCreateObservation(observation, callback) {
        var body = JSON.stringify({
            jsonrpc: '2.0',
            method: 'updateOrCreateObservation',
            id: observation.id || new Date().getTime().toString(),
            params: {
                id: observation.id,
                attributes: observation,
            },
        });

        var xhr = new XMLHttpRequest();

        xhr.responseType = 'json';

        xhr.onload = function onRequestLoaded() {
            var res = xhr.response;

            if (res.error) {
                // eslint-disable-next-line no-console
                console.log('Error in updateOrCreateObservation()', res);
                alert('JSON RPC Error: ' + res.error.message);
            } else {
                observation.id = res.result.id;
            }

            if (callback) {
                callback();
            }
        };

        xhr.open('POST', '/observations-rpc');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(body);
    }

    // This will upload the media file to the object management service, and associate the
    // media item meta data with the observation record.
    function uploadMediaFile(observation, file, callback) {
        var xhr = new XMLHttpRequest();

        xhr.responseType = 'json';

        xhr.onerror = callback;

        xhr.onload = function onRequestComplete() {
            xhr.onerror = null;
            xhr.onload = null;

            if (xhr.status === 201 || xhr.status === 200) {
                var res = xhr.response;

                if (res.errors) {
                    var msg = (res.errors[0] || {}).detail || 'No server error message';
                    // eslint-disable-next-line no-console
                    console.log(observation.id, 'error uploading observation media', res.errors);
                    callback(new Error('Unexpected RPC error: ' + msg));
                } else {
                    callback(null, res.data);
                }
            } else {
                callback(new Error('Unexpected status code: ' + xhr.status));
            }
        };

        // Open and send the request in the next turn of the event loop. This is required for the caller
        // to be able to set the upload event listeners.
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload
        setTimeout(function () {
            xhr.open('PUT', '/observations/' + observation.id + '/media/' + file.name);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });

        return xhr;
    }

    // Updates the title and detail attributes of an existing media item.
    function updateObservationMedia(observation, mediaItems, callback) {
        var xhr = new XMLHttpRequest();

        xhr.responseType = 'json';

        xhr.onerror = callback;

        xhr.onload = function onRequestComplete() {
            xhr.onerror = null;
            xhr.onload = null;

            if (xhr.status === 200) {
                var res = xhr.response;

                if (res.error) {
                    // eslint-disable-next-line no-console
                    console.log('Error in updateObservationMedia()', res);
                    var error = new Error('JSON RPC Error: ' + res.error.message);
                    error.code = res.error.code;
                    callback(error);
                } else {
                    callback(null, res.result);
                }
            } else {
                callback(new Error('Unexpected status code: ' + xhr.status));
            }
        };

        var body = JSON.stringify({
            jsonrpc: '2.0',
            method: 'updateObservationMedia',
            id: observation.id,
            params: [
                // The observationId
                observation.id,
                // Media Items
                mediaItems,
            ],
        });

        xhr.open('POST', '/observations-rpc');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(body);
    }

    function initializeTextArea(el) {
        el.oninput = function onTextAreaInput() {
            var height = el.scrollHeight;

            // It is important that textareas are set to the same starting hight in CSS.
            if (height > 80) {
                el.style.height = height + 'px';
            }
        };
    }

    function initializeNavMenu(menu, menuOpenButton) {

        function closeMenu() {
            document.body.removeEventListener('click', closeMenu);
            menu.classList.remove('is-open');
        }

        menuOpenButton.onclick = function openMenu() {
            menu.classList.add('is-open');

            // Set the body click handler in the next turn of the event loop so
            // we do not capture this current click event.
            setTimeout(function addBodyClickHandler() {
                document.body.addEventListener('click', closeMenu);
            }, 12);
        };
    }

    function createMediaUploader(observable, observation, file) {

        return function uploadMedia(callback) {
            // We avoid a race condition on creating the observation on the server by
            // serializing the calls to uploadMedia (see below).
            if (observation.id) {
                whenObservationCreated();
            } else {
                updateOrCreateObservation(observation, whenObservationCreated);
            }

            function whenObservationCreated() {
                var xhr = uploadMediaFile(observation, file, whenMediaCreated);

                xhr.upload.addEventListener('progress', function onxhrprogress(ev) {
                    var percent = ev.loaded / ev.total;

                    if (typeof observable.onuploadprogress === 'function') {
                        observable.onuploadprogress({ progress: percent });
                    }
                });
            }

            function whenMediaCreated(err, mediaItem) {
                if (mediaItem && typeof observable.onuploadprogress === 'function') {
                    observable.onuploadprogress({ mediaItem: mediaItem });
                }

                // Signal to the caller that the observation has been created and updated:
                // It is safe to upload the next media file without causing a race condition.
                callback();
            }
        };
    }

    function Observation() {
        // Keep the formData value private.
        Object.defineProperty(this, 'formData', {
            enumerable: false,
            value: {},
        });

        this.id = null;
        this.name = '';
        this.email = '';
        this.title = '';
        this.observationDateTime = '';
        this.reportedDateTime = dateToISOTZString(new Date());
        this.travelMode = '';
        this.location = '';
        this.elevation = '';
        this.aspect = '';
        this.redFlags = [];
        this.triggeredAvalanche = false;
        this.observedAvalanche = false;
        this.triggeredAvalancheType = '';
        this.triggeredAvalancheSize = '';
        this.triggeredAvalancheComments = '';
        this.observedAvalancheType = '';
        this.observedAvalancheSize = '';
        this.observedAvalancheComments = '';
        this.details = '';
    }

    Observation.prototype.mergeFormData = function mergeFormData(newData) {
        extendObject(this.formData, newData);

        this.name = this.formData.name || '';
        this.email = this.formData.email || '';
        this.title = this.formData.title || '';

        this.travelMode = this.formData.travelMode;
        this.location = this.formData.location || '';
        this.elevation = this.formData.elevation || '';
        this.aspect = this.formData.aspect || '';
        this.details = this.formData.details || '';
        this.redFlags = this.formData.redFlags || [];

        if (this.formData.date && this.formData.time) {
            var datetime = new Date(this.formData.date + 'T' + this.formData.time);
            this.observationDateTime = dateToISOTZString(datetime);
        }

        if (this.formData.observationType === 'triggeredAvalanche') {
            this.triggeredAvalanche = true;
            this.triggeredAvalancheType = this.formData.avalancheType;
            this.triggeredAvalancheSize = this.formData.avalancheSize;
            this.triggeredAvalancheComments = this.formData.avalancheComments;

            this.observedAvalanche = false;
            this.observedAvalancheType = '';
            this.observedAvalancheSize = '';
            this.observedAvalancheComments = '';
        } else if (this.formData.observationType === 'observedAvalanche') {
            this.observedAvalanche = true;
            this.observedAvalancheType = this.formData.avalancheType;
            this.observedAvalancheSize = this.formData.avalancheSize;
            this.observedAvalancheComments = this.formData.avalancheComments;

            this.triggeredAvalanche = false;
            this.triggeredAvalancheType = '';
            this.triggeredAvalancheSize = '';
            this.triggeredAvalancheComments = '';
        } else {
            this.triggeredAvalanche = false;
            this.observedAvalanche = false;

            this.observedAvalancheType = '';
            this.observedAvalancheSize = '';
            this.observedAvalancheComments = '';

            this.triggeredAvalancheType = '';
            this.triggeredAvalancheSize = '';
            this.triggeredAvalancheComments = '';
        }
    };

    var FormSectionPrototype = {

        bindHandlers: function bindHandlers(onSectionBack, onSectionNext) {
            var thisSelf = this;

            this.onSectionBack = function (ev) {
                thisSelf.beforeSectionBack(function () {
                    onSectionBack(ev);
                });
            };

            this.onSectionNext = function (ev) {
                thisSelf.beforeSectionNext(function () {
                    onSectionNext(ev);
                });
            };

            this.backButton = this.el.querySelector('.observation-form__back-button');
            this.nextButton = this.el.querySelector('.observation-form__next-button');

            if (this.backButton) {
                this.backButton.addEventListener('click', this.onSectionBack);
            }

            if (this.nextButton) {
                this.nextButton.addEventListener('click', this.onSectionNext);
            }
        },

        beforeSectionBack: function beforeSectionBack(cb) {
            cb();
        },

        beforeSectionNext: function beforeSectionNext(cb) {
            cb();
        },

        unbindHandlers: function unbindHandlers() {
            if (this.backButton) {
                this.backButton.removeEventListener('click', this.onSectionBack);
            }

            if (this.nextButton) {
                this.nextButton.removeEventListener('click', this.onSectionNext);
            }
        },

        getValues: function getValues() {
            return {};
        },

        validateInput: function validateInput() {
            return this.getValues();
        },
    };

    function ObservationFormSectionBase(el) {
        this.el = el;
        this.id = el.id;
        this.values = {};
    }

    extendObject(ObservationFormSectionBase.prototype, FormSectionPrototype);

    extendObject(ObservationFormSectionBase.prototype, {

        getObservationType: function getObservationType() {
            var selectedRadio = this.el.querySelector('input[name="observationType"]:checked');
            if (selectedRadio) {
                return selectedRadio.value;
            }
            return null;
        },

        getValues: function getValues() {
            return {
                date: document.getElementById('observation-form__date').value,
                time: document.getElementById('observation-form__time').value,
                observationType: this.getObservationType(),
                location: document.getElementById('observation-form__location').value,
                title: document.getElementById('observation-form__title').value,
            };
        },

        validateInput: function validateInput() {
            this.values = this.getValues();

            if (!this.values.date || !this.values.time || !this.values.location || !this.values.title) {
                showAlert(this.el.querySelector('.alert'), 4000);
                return false;
            }

            return this.values;
        },

        areAvalancheDetailsRequired: function areAvalancheDetailsRequired() {
            return this.values.observationType === 'observedAvalanche'
                || this.values.observationType === 'triggeredAvalanche';
        },
    });

    function ObservationFormSectionAvalanche(el) {
        this.el = el;
        this.id = el.id;
    }

    extendObject(ObservationFormSectionAvalanche.prototype, FormSectionPrototype);

    extendObject(ObservationFormSectionAvalanche.prototype, {

        getAvalancheSize: function getAvalancheSize() {
            var selectedRadio = this.el.querySelector('input[name="avalancheSize"]:checked');
            if (selectedRadio) {
                return selectedRadio.value;
            }
            return null;
        },

        getValues: function getValues() {
            return {
                avalancheType: this.el.querySelector('select[name="avalancheType"]').value,
                avalancheSize: this.getAvalancheSize(),
                avalancheComments: this.el.querySelector('textarea[name="avalancheComments"]').value,
            };
        },

        validateInput: function validateInput() {
            var values = this.getValues();

            if (!values.avalancheComments) {
                showAlert(this.el.querySelector('.alert'), 4000);
                return false;
            }

            return values;
        },
    });

    function ObservationFormSectionDetails(el) {
        this.el = el;
        this.id = el.id;
    }

    extendObject(ObservationFormSectionDetails.prototype, FormSectionPrototype);

    extendObject(ObservationFormSectionDetails.prototype, {

        getRedFlags: function getRedFlags() {
            var nodes = this.el.querySelectorAll('input[name="redFlags"]:checked');
            var values = [];

            nodes.forEach(function eachNode(node) {
                values.push(node.value);
            });

            return values;
        },

        getValues: function getValues() {
            return {
                travelMode: document.getElementById('observation-form__travel_mode').value,
                elevation: document.getElementById('observation-form__elevation').value,
                aspect: this.el.querySelector('select[name="aspect"]').value,
                redFlags: this.getRedFlags(),
                details: document.getElementById('observation-form__details').value,
            };
        },

        validateInput: function validateInput() {
            var data = this.getValues();

            if (!data.details) {
                showAlert(this.el.querySelector('.alert'), 4000);
                return false;
            }

            return data;
        },
    });

    function ObservationFormSectionPhotos(el, observation) {
        this.el = el;
        this.id = el.id;
        this.observation = observation;
        this.mediaCards = [];

        var fileInput = el.querySelector('input[type="file"]');
        this.fileInput = fileInput;

        this.thumbnailsContainer = el.querySelector('.media-input-field__thumbnails');

        fileInput.oninput = this.onSelectFilesInput.bind(this);

        var selectFilesButtons = el.querySelectorAll('button.form-field__file-select-button');

        // Activate the hidden file input.
        selectFilesButtons.forEach(function (button) {
            button.onclick = function () {
                fileInput.click();
            };
        });
    }

    extendObject(ObservationFormSectionPhotos.prototype, FormSectionPrototype);

    extendObject(ObservationFormSectionPhotos.prototype, {

        beforeSectionNext: function beforeSectionNext(callback) {
            var mediaItems = this.mediaCards.map(function (card) {
                return card.getFormData();
            });

            if (this.observation.id && mediaItems.length > 0) {
                // Only update the media items if the observation has been created during the
                // media upload process.
                updateObservationMedia(this.observation, mediaItems, callback);
            } else {
                callback();
            }
        },

        beforeSectionBack: function beforeSectionBack(callback) {
            var mediaItems = this.mediaCards.map(function (card) {
                return card.getFormData();
            });

            if (this.observation.id && mediaItems.length > 0) {
                // Only update the media items if the observation has been created during the
                // media upload process.
                updateObservationMedia(this.observation, mediaItems, callback);
            } else {
                callback();
            }
        },

        // When the user has selected file(s).
        onSelectFilesInput: function onSelectFilesInput() {
            var thisSelf = this;
            var mediaCards = this.mediaCards;
            var fileInput = this.fileInput;
            var thumbnailsContainer = this.thumbnailsContainer;
            var observation = this.observation;

            var mediaCardsToAppend = [];
            var uploaders = [];

            for (var i = 0; i < fileInput.files.length; i = i + 1) {
                var observable = {};
                var observationMediaCard = new ObservationMediaCard(observable, fileInput.files[i]);

                mediaCards.push(observationMediaCard);
                mediaCardsToAppend.push(observationMediaCard);

                uploaders.push(createMediaUploader(observable, observation, fileInput.files[i]));

                observationMediaCard.onremove = function onremove(thisCard) {
                    var index = mediaCards.findIndex(function (card) {
                        return card === thisCard;
                    });

                    if (index >= 0) {
                        mediaCards.splice(index, 1);
                    }

                    thisSelf.scrollThumbnailsContainerIntoView();
                };

                observationMediaCard.initialize();
            }

            // Hide the button which initially triggered the file selector.
            this.hideInitialInputAction(function renderImageCards() {
                mediaCardsToAppend.forEach(function appendNode(card) {
                    thumbnailsContainer.appendChild(card.el);
                });

                thisSelf.collapseInitialInputAction();
                thisSelf.showMediaCards();
                thisSelf.showAddMoreButton();
            });

            // Create the observation, and upload media in serial to avoid race conditions.
            function uploadMedia() {
                if (uploaders.length > 0) {
                    var uploader = uploaders.pop();
                    uploader(uploadMedia);
                }
            }

            uploadMedia();
        },

        hideInitialInputAction: function hideInitialInputAction(callback) {
            var target = this.el.querySelector('.form-field__file-input-action');

            function onTransitionEnd() {
                target.removeEventListener('transitionend', onTransitionEnd);
                callback();
            }

            if (target.classList.contains('hidden')) {
                callback();
            } else {
                target.addEventListener('transitionend', onTransitionEnd);
                target.classList.add('hidden');
            }
        },

        collapseInitialInputAction: function collapseInitialInputAction() {
            var target = this.el.querySelector('.form-field__file-input-action');
            target.classList.add('collapsed');
        },

        showMediaCards: function showMediaCards() {
            this.thumbnailsContainer.classList.add('active');
        },

        showAddMoreButton: function showAddMoreButton() {
            this.el.querySelector('.media-input-field__add-more').classList.add('active');
        },

        scrollThumbnailsContainerIntoView: function scrollThumbnailsContainerIntoView() {
            this.thumbnailsContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        },
    });

    function ObservationFormSectionSubmit(el) {
        this.el = el;
        this.id = el.id;
    }

    extendObject(ObservationFormSectionSubmit.prototype, FormSectionPrototype);

    extendObject(ObservationFormSectionSubmit.prototype, {
        getValues: function getValues() {
            return {
                name: document.getElementById('observation-form__name').value,
                email: document.getElementById('observation-form__email').value,
            };
        },
    });

    function ObservationFormSectionThankYou(el) {
        this.el = el;
        this.id = el.id;
    }

    extendObject(ObservationFormSectionThankYou.prototype, FormSectionPrototype);

    function ObservationMediaCard(observable, file) {
        this.observable = observable;
        this.file = file;
        this.mediaItem = null;
        this.el = document.createElement('div');
    }

    ObservationMediaCard.prototype.initialize = function () {
        var thisSelf = this;
        var wrapper = this.el;
        var file = this.file;
        var observable = this.observable;

        wrapper.classList.add('media-preview-thumbnail');
        wrapper.innerHTML = document.getElementById('template_image-card').innerHTML;

        // Wait for a turn of the event loop before querying the
        // newly rendered DOM.
        setTimeout(function () {
            wrapper.querySelector('[name="file_name"]').innerText = file.name;

            var removeButton = wrapper.querySelector('.media-preview-thumbnail__remove-button');

            removeButton.onclick = function onremoveclick() {

                function onTransitionEnd() {
                    wrapper.removeEventListener('transitionend', onTransitionEnd);
                    wrapper.parentNode.removeChild(wrapper);

                    // Signal that this DOM tree has been removed.
                    if (typeof thisSelf.onremove === 'function') {
                        thisSelf.onremove(thisSelf);
                    }
                }

                wrapper.addEventListener('transitionend', onTransitionEnd);
                wrapper.classList.add('hidden');

                observable.onuploadprogress = null;
            };
        });

        observable.onuploadprogress = this.onUploadProgress.bind(this);
    };

    ObservationMediaCard.prototype.getFormData = function () {
        return {
            // The MediaItem should have been created before calling getFormData()
            id: this.mediaItem.id,
            title: this.el.querySelector('input[name="photo_title"]').value,
            details: this.el.querySelector('textarea[name="photo_details"]').value,
        };
    };

    ObservationMediaCard.prototype.onUploadProgress = function onUploadProgress(ev) {
        var wrapper = this.el;

        if (ev.mediaItem) {
            var imageWrapper = wrapper.querySelector('.media-preview-thumbnail__image-wrapper');
            this.mediaItem = ev.mediaItem;

            if (this.mediaItem.type === 'video') {
                // Videos will continue to process in the background. At this point we do not have a way
                // to be notified when the poster image is ready. Instead we give the user a pacifier.
                imageWrapper.innerHTML = '<p><i class="material-symbols-outlined">cloud_sync</i><br />Video upload complete.<br />The video will be available when the observation is submitted.</p>';
            } else {
                // Image processing will be ready on demand.
                var mediaURLs = this.mediaItem.mediaURLs && this.mediaItem.mediaURLs.cdns;
                imageWrapper.innerHTML = '<img src="' + mediaURLs[0] + '?auto=format&width=640" alt="Image preview">';
            }
        } else {
            var icon = wrapper.querySelector('.media-preview-thumbnail__image-wrapper i.material-symbols-outlined');

            if (ev.progress >= 0.8) {
                icon.innerText = 'clock_loader_80';
            } else if (ev.progress >= 0.6) {
                icon.innerText = 'clock_loader_60';
            } else if (ev.progress >= 0.4) {
                icon.innerText = 'clock_loader_40';
            } else if (ev.progress >= 0.2) {
                icon.innerText = 'clock_loader_20';
            } else {
                // Did it start?
                icon.innerText = 'clock_loader_10';
            }
        }
    };

    function initializeObservationForm(form) {
        var AVALANCHE_DETAILS_SECTION_ID = 'observation-form__section-2';
        var avalancheDetailsRequired = false;

        var observation = new Observation();
        var formIntro = document.getElementById('top-of-form');
        var formSectionNodes = form.querySelectorAll('.form-section');

        var sections = mapNodes(formSectionNodes, createFormSection);

        var currentSectionIndex = 0;
        var currentSection = sections[currentSectionIndex];

        // Prevent form submission when back <> next buttons are clicked.
        form.addEventListener('submit', function onObservationFormSubmit(ev) {
            ev.preventDefault();
            ev.stopPropagation();
        });

        function createFormSection(el) {
            switch (el.id) {
                case 'observation-form__section-1':
                    return new ObservationFormSectionBase(el, observation);
                case 'observation-form__section-2':
                    return new ObservationFormSectionAvalanche(el, observation);
                case 'observation-form__section-3':
                    return new ObservationFormSectionDetails(el, observation);
                case 'observation-form__section-4':
                    return new ObservationFormSectionPhotos(el, observation);
                case 'observation-form__section-5':
                    return new ObservationFormSectionSubmit(el, observation);
                case 'observation-form__section-6':
                    return new ObservationFormSectionThankYou(el, observation);
            }

            return null;
        }

        function hideCurrentSection() {
            currentSection.el.classList.remove('form-section--active');
            currentSection.unbindHandlers();
        }

        function showCurrentSection() {
            currentSection.el.classList.add('form-section--active');
            currentSection.bindHandlers(onSectionBack, onSectionNext);

            formIntro.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }

        function transitionBackward() {
            hideCurrentSection();

            currentSectionIndex = currentSectionIndex - 1;
            currentSection = sections[currentSectionIndex];

            if (!avalancheDetailsRequired && currentSection.id === AVALANCHE_DETAILS_SECTION_ID) {
                currentSectionIndex = currentSectionIndex - 1;
                currentSection = sections[currentSectionIndex];
            }

            showCurrentSection();
        }

        function transitionForward() {
            hideCurrentSection();

            currentSectionIndex = currentSectionIndex + 1;
            currentSection = sections[currentSectionIndex];

            if (!avalancheDetailsRequired && currentSection.id === AVALANCHE_DETAILS_SECTION_ID) {
                currentSectionIndex = currentSectionIndex + 1;
                currentSection = sections[currentSectionIndex];
            }

            showCurrentSection();
        }

        function onSectionBack(ev) {
            var data = currentSection.validateInput();

            if (data) {
                observation.mergeFormData(data);

                if (observation.id || ev.target.getAttribute('data-submit')) {
                    updateOrCreateObservation(observation);
                }

                if (typeof currentSection.areAvalancheDetailsRequired === 'function') {
                    avalancheDetailsRequired = currentSection.areAvalancheDetailsRequired();
                }

                transitionBackward();
            }
        }

        function onSectionNext(ev) {
            var data = currentSection.validateInput();

            if (data) {
                observation.mergeFormData(data);

                if (observation.id || ev.target.getAttribute('data-submit')) {
                    updateOrCreateObservation(observation);
                }

                if (typeof currentSection.areAvalancheDetailsRequired === 'function') {
                    avalancheDetailsRequired = currentSection.areAvalancheDetailsRequired();
                }

                transitionForward();
            }
        }

        // Activate the first section.
        currentSection.bindHandlers(onSectionBack, onSectionNext);
    }

    // Contained initialization.
    (function encloseInitialization() {
        var menu = document.getElementById('site-header__nav-menu');
        var menuOpenButton = document.getElementById('nav-menu-open-button');
        if (menu && menuOpenButton) {
            initializeNavMenu(menu, menuOpenButton);
        }

        var textAreaNodes = document.querySelectorAll('textarea');
        textAreaNodes.forEach(initializeTextArea);

        var observationForm = document.getElementById('observation-form');
        if (observationForm) {
            initializeObservationForm(observationForm);
        }
    }());
}());
