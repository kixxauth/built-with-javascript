(function encloseAdkAvy() {
    'use strict';

    var generateUniqueId = (function () {
        var uid = 0;
        return function () {
            uid += 1;
            return uid;
        };
    }());

    function Observation() {
        // Keep the formData and media values private.
        Object.defineProperties(this, {
            formData: {
                enumerable: false,
                value: {},
            },
            media: {
                enumerable: false,
                writable: true,
                value: [],
            },
        });

        this.id = null;

        this.attributes = {
            name: '',
            email: '',
            title: '',
            observationDateTime: '',
            reportedDateTime: dateToISOTZString(new Date()),
            travelMode: '',
            location: '',
            elevation: '',
            aspect: '',
            redFlags: [],
            triggeredAvalanche: false,
            observedAvalanche: false,
            triggeredAvalancheType: '',
            triggeredAvalancheSize: '',
            triggeredAvalancheComments: '',
            observedAvalancheType: '',
            observedAvalancheSize: '',
            observedAvalancheComments: '',
            details: '',
        };
    }

    extendObject(Observation.prototype, {

        mergeFormData: function (newData) {
            extendObject(this.formData, newData);

            var attrs = this.attributes;

            attrs.name = this.formData.name || '';
            attrs.email = this.formData.email || '';
            attrs.title = this.formData.title || '';

            attrs.travelMode = this.formData.travelMode;
            attrs.location = this.formData.location || '';
            attrs.elevation = this.formData.elevation || '';
            attrs.aspect = this.formData.aspect || '';
            attrs.details = this.formData.details || '';
            attrs.redFlags = this.formData.redFlags || [];

            if (this.formData.date && this.formData.time) {
                var datetime = new Date(this.formData.date + 'T' + this.formData.time);
                attrs.observationDateTime = dateToISOTZString(datetime);
            }

            if (this.formData.observationType === 'triggeredAvalanche') {
                attrs.triggeredAvalanche = true;
                attrs.triggeredAvalancheType = this.formData.avalancheType;
                attrs.triggeredAvalancheSize = this.formData.avalancheSize;
                attrs.triggeredAvalancheComments = this.formData.avalancheComments;

                attrs.observedAvalanche = false;
                attrs.observedAvalancheType = '';
                attrs.observedAvalancheSize = '';
                attrs.observedAvalancheComments = '';
            } else if (this.formData.observationType === 'observedAvalanche') {
                attrs.observedAvalanche = true;
                attrs.observedAvalancheType = this.formData.avalancheType;
                attrs.observedAvalancheSize = this.formData.avalancheSize;
                attrs.observedAvalancheComments = this.formData.avalancheComments;

                attrs.triggeredAvalanche = false;
                attrs.triggeredAvalancheType = '';
                attrs.triggeredAvalancheSize = '';
                attrs.triggeredAvalancheComments = '';
            } else {
                attrs.triggeredAvalanche = false;
                attrs.observedAvalanche = false;

                attrs.observedAvalancheType = '';
                attrs.observedAvalancheSize = '';
                attrs.observedAvalancheComments = '';

                attrs.triggeredAvalancheType = '';
                attrs.triggeredAvalancheSize = '';
                attrs.triggeredAvalancheComments = '';
            }
        },

        setMediaItems: function (media) {
            this.media = media;
        },

        isSaved: function () {
            return Boolean(this.id);
        },

        save: function (callback) {
            this.updateOrCreate(function (thisSelf) {
                if (thisSelf.media && thisSelf.media.length > 0) {
                    thisSelf.updateMediaItems(callback);
                }
            });
        },

        removeMediaItem: function (id) {
            // If the Observation has not been saved to the server, this is a no-op.
            if (this.isSaved()) {
                var index = findIndex(this.media, function (mediaItem) {
                    return mediaItem.id === id;
                });

                if (index >= 0) {
                    this.media.splice(index, 1);
                }

                // Params: observation.id, mediaItem.id
                var params = [ this.id, id ];

                sendJsonRPC(this.id, 'removeMediaItem', params, function (err) {
                    if (err) {
                        // eslint-disable-next-line no-console
                        console.log('Error in removeMediaItem()', err);
                        alert('JSON RPC Error: ' + err.message);
                    }
                });
            }
        },

        updateOrCreate: function (callback) {
            var thisSelf = this;
            var params = {
                id: this.id,
                attributes: this.attributes,
            };

            sendJsonRPC(this.id, 'updateOrCreateObservation', params, function (err, result) {
                if (err) {
                    // eslint-disable-next-line no-console
                    console.log('Error in updateOrCreateObservation()', err);
                    alert('JSON RPC Error: ' + err.message);
                } else {
                    thisSelf.id = result.id;
                }

                if (typeof callback === 'function') {
                    callback(thisSelf);
                }
            });
        },

        updateMediaItems: function (callback) {
            var thisSelf = this;
            var params = [ this.id, this.media ];

            sendJsonRPC(this.id, 'updateMediaItems', params, function (err) {
                if (err) {
                    // eslint-disable-next-line no-console
                    console.log('Error in updateMediaItems()', err);
                    alert('JSON RPC Error: ' + err.message);
                }

                if (typeof callback === 'function') {
                    callback(thisSelf);
                }
            });
        },
    });

    var FormSectionPrototype = {
        // Props:
        // onSectionBack
        // onSectionNext
        // onSectionSave

        mount: function () {
            this.el.classList.add('form-section--active');

            this.backButton = this.el.querySelector('.observation-form__back-button');
            this.nextButton = this.el.querySelector('.observation-form__next-button');
            this.saveButton = this.el.querySelector('.observation-form__save-button');

            if (this.backButton) {
                this.backButton.addEventListener('click', this.props.onSectionBack);
            }

            if (this.nextButton) {
                this.nextButton.addEventListener('click', this.props.onSectionNext);
            }

            if (this.saveButton) {
                this.saveButton.addEventListener('click', this.props.onSectionSave);
            }
        },

        unmount: function () {
            this.el.classList.remove('form-section--active');

            if (this.backButton) {
                this.backButton.removeEventListener('click', this.props.onSectionBack);
            }

            if (this.nextButton) {
                this.nextButton.removeEventListener('click', this.props.onSectionNext);
            }

            if (this.saveButton) {
                this.saveButton.removeEventListener('click', this.props.onSectionSave);
            }
        },

        getValues: function () {
            return {};
        },

        validateInput: function () {
            return this.getValues();
        },

        enableActionButtons: function () {
            if (this.backButton) {
                this.backButton.disabled = false;
            }

            if (this.nextButton) {
                this.nextButton.disabled = false;
            }

            if (this.saveButton) {
                this.saveButton.disabled = false;
            }
        },

        disableActionButtons: function () {
            if (this.backButton) {
                this.backButton.disabled = true;
            }

            if (this.nextButton) {
                this.nextButton.disabled = true;
            }

            if (this.saveButton) {
                this.saveButton.disabled = true;
            }
        },

        isAvalancheFormSection: noop,
        isSubmitSection: noop,
        isConfirmationSection: noop,
    };


    function ObservationFormSectionBase(el, props, state) {
        this.el = el;
        this.props = props;
        this.state = state;
    }
    extendObject(ObservationFormSectionBase.prototype, FormSectionPrototype);
    extendObject(ObservationFormSectionBase.prototype, {

        getObservationType: function () {
            var selectedRadio = this.el.querySelector('input[name="observationType"]:checked');
            if (selectedRadio) {
                return selectedRadio.value;
            }
            return null;
        },

        getValues: function () {
            return {
                date: document.getElementById('observation-form__date').value,
                time: document.getElementById('observation-form__time').value,
                observationType: this.getObservationType(),
                location: document.getElementById('observation-form__location').value,
                title: document.getElementById('observation-form__title').value,
            };
        },

        validateInput: function () {
            var values = this.getValues();

            if (!values.date || !values.time || !values.location || !values.title) {
                showAlert(this.el.querySelector('.alert'), 4000);
                return false;
            }

            return values;
        },

        areAvalancheDetailsRequired: function () {
            var values = this.getValues();
            return values.observationType === 'observedAvalanche'
                || values.observationType === 'triggeredAvalanche';
        },
    });


    function ObservationFormSectionAvalanche(el, props, state) {
        this.el = el;
        this.props = props;
        this.state = state;
    }
    extendObject(ObservationFormSectionAvalanche.prototype, FormSectionPrototype);
    extendObject(ObservationFormSectionAvalanche.prototype, {

        getAvalancheSize: function () {
            var selectedRadio = this.el.querySelector('input[name="avalancheSize"]:checked');
            if (selectedRadio) {
                return selectedRadio.value;
            }
            return null;
        },

        getValues: function () {
            return {
                avalancheType: this.el.querySelector('select[name="avalancheType"]').value,
                avalancheSize: this.getAvalancheSize(),
                avalancheComments: this.el.querySelector('textarea[name="avalancheComments"]').value,
            };
        },

        validateInput: function () {
            var values = this.getValues();

            if (!values.avalancheComments) {
                showAlert(this.el.querySelector('.alert'), 4000);
                return false;
            }

            return values;
        },

        isAvalancheFormSection: function () {
            return true;
        },
    });


    function ObservationFormSectionDetails(el, props, state) {
        this.el = el;
        this.props = props;
        this.state = state;
    }
    extendObject(ObservationFormSectionDetails.prototype, FormSectionPrototype);
    extendObject(ObservationFormSectionDetails.prototype, {

        getRedFlags: function () {
            var nodes = this.el.querySelectorAll('input[name="redFlags"]:checked');
            var values = [];

            nodes.forEach(function eachNode(node) {
                values.push(node.value);
            });

            return values;
        },

        getValues: function () {
            return {
                travelMode: document.getElementById('observation-form__travel_mode').value,
                elevation: document.getElementById('observation-form__elevation').value,
                aspect: this.el.querySelector('select[name="aspect"]').value,
                redFlags: this.getRedFlags(),
                details: document.getElementById('observation-form__details').value,
            };
        },

        validateInput: function () {
            var values = this.getValues();

            if (!values.details) {
                showAlert(this.el.querySelector('.alert'), 4000);
                return false;
            }

            return values;
        },
    });


    function ObservationFormSectionMedia(el, props, state) {
        this.el = el;
        this.props = props;
        this.state = state;
        this.state.mediaCards = [];
    }
    extendObject(ObservationFormSectionMedia.prototype, FormSectionPrototype);
    extendObject(ObservationFormSectionMedia.prototype, {

        mount: function () {
            FormSectionPrototype.mount.call(this);

            var fileInput = this.el.querySelector('input[type="file"]');

            this.props.fileInput = fileInput;
            this.props.thumbnailsContainer = this.el.querySelector('.media-input-field__thumbnails');

            fileInput.oninput = this.onSelectFilesInput.bind(this);

            // The file-select-button selector will include both the original
            // file selector button as well as the Select More button.
            var selectFilesButtons = this.el.querySelectorAll('button.form-field__file-select-button');

            // Activate the hidden file input.
            selectFilesButtons.forEach(function (button) {
                button.onclick = function () {
                    fileInput.click();
                };
            });
        },

        getValues: function () {
            var media = [];
            var mediaCards = this.state.mediaCards;

            for (var i = 0; i < mediaCards.length; i += 1) {
                media.push(mediaCards[i].getValues());
            }

            return { media: media };
        },

        // When the user has selected file(s).
        onSelectFilesInput: function () {
            var thisSelf = this;
            var props = this.props;
            var state = this.state;
            var uploadTracker = this.createAsyncUploadTracker();

            // Disable the navigation buttons while files are uploading.
            this.disableActionButtons();

            // Enable the nav buttons when files are done uploading.
            uploadTracker.onuploadscomplete = function () {
                thisSelf.enableActionButtons();
            };

            var mediaCardsToAppend = [];

            for (var i = 0; i < props.fileInput.files.length; i = i + 1) {
                var file = props.fileInput.files[i];

                var mediaCard = new ObservationMediaCard(
                    null,
                    { onremove: this.onMediaCardRemoved.bind(this) },
                    { file: file }
                );

                state.mediaCards.push(mediaCard);
                mediaCardsToAppend.push(mediaCard);
                mediaCard.mount();

                this.uploadMedia(file, mediaCard, uploadTracker);
            }

            // Hide the button which initially triggered the file selector.
            this.hideInitialInputAction(function () {
                mediaCardsToAppend.forEach(function (card) {
                    props.thumbnailsContainer.appendChild(card.el);
                });

                thisSelf.collapseInitialInputAction();
                thisSelf.showMediaCards();
                thisSelf.showAddMoreButton();
            });
        },

        uploadMedia: function (file, mediaCard, tracker) {
            uploadMedia(file, function (ev) {
                mediaCard.onUploadProgress(ev);
                tracker.trackUpload(ev.id, ev.progress);
            });
        },

        hideInitialInputAction: function (callback) {
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

        collapseInitialInputAction: function () {
            var target = this.el.querySelector('.form-field__file-input-action');
            target.classList.add('collapsed');
        },

        showMediaCards: function () {
            this.props.thumbnailsContainer.classList.add('active');
        },

        showAddMoreButton: function () {
            this.el.querySelector('.media-input-field__add-more').classList.add('active');
        },

        scrollThumbnailsContainerIntoView: function () {
            this.props.thumbnailsContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        },

        onMediaCardRemoved: function (thisCard) {
            this.scrollThumbnailsContainerIntoView();

            var index = this.state.mediaCards.indexOf(thisCard);

            if (index >= 0) {
                this.state.mediaCards.splice(index, 1);
            }

            var mediaItem = thisCard.getValues();

            this.state.observation.removeMediaItem(mediaItem.id);
        },

        createAsyncUploadTracker: function () {
            var uploadTrackers = [];

            var observable = {
                trackUpload: function (id, progress) {
                    var index = uploadTrackers.indexOf(id);

                    if (index === -1) {
                        index = uploadTrackers.push(id) - 1;
                    }

                    if (progress >= 1) {
                        uploadTrackers.splice(index, 1);

                        // If the trackers have all been consumed, then the uploading is complete.
                        if (uploadTrackers.length === 0 && typeof observable.onuploadscomplete === 'function') {
                            observable.onuploadscomplete();
                        }
                    }
                },
            };

            return observable;
        },
    });


    function ObservationFormSectionSubmit(el, props, state) {
        this.el = el;
        this.props = props;
        this.state = state;
    }
    extendObject(ObservationFormSectionSubmit.prototype, FormSectionPrototype);
    extendObject(ObservationFormSectionSubmit.prototype, {
        getValues: function () {
            return {
                name: document.getElementById('observation-form__name').value,
                email: document.getElementById('observation-form__email').value,
            };
        },

        isSubmitSection: function () {
            return true;
        },
    });


    function ObservationFormSectionThankYou(el, props, state) {
        this.el = el;
        this.props = props;
        this.state = state;
    }
    extendObject(ObservationFormSectionThankYou.prototype, FormSectionPrototype);
    extendObject(ObservationFormSectionThankYou.prototype, {
        isConfirmationSection: function () {
            return true;
        },
    });


    function ObservationMediaCard(el, props, state) {
        this.props = props; // { onremove }
        this.state = state; // { file, mediaItem }
        this.el = document.createElement('div');
    }
    extendObject(ObservationMediaCard.prototype, {

        getRemoveButton: function () {
            return this.el.querySelector('.media-preview-thumbnail__remove-button');
        },

        getValues: function () {
            var mediaItem = this.state.mediaItem || {};

            mediaItem.title = this.el.querySelector('input[name="photo_title"]').value;
            mediaItem.details = this.el.querySelector('textarea[name="photo_details"]').value;

            return mediaItem;
        },

        mount: function () {
            var thisSelf = this;
            var props = this.props;
            var state = this.state;
            var wrapper = this.el;

            wrapper.classList.add('media-preview-thumbnail');
            wrapper.innerHTML = document.getElementById('template_image-card').innerHTML;

            // Wait for a turn of the event loop before querying the
            // newly rendered DOM.
            setTimeout(function () {
                wrapper.querySelector('[name="file_name"]').innerText = state.file.name;

                var removeButton = thisSelf.getRemoveButton();

                removeButton.onclick = function onremoveclick() {

                    function onTransitionEnd() {
                        wrapper.removeEventListener('transitionend', onTransitionEnd);
                        wrapper.parentNode.removeChild(wrapper);

                        // Signal that this DOM tree has been removed.
                        if (typeof props.onremove === 'function') {
                            props.onremove(thisSelf);
                        }
                    }

                    wrapper.addEventListener('transitionend', onTransitionEnd);
                    wrapper.classList.add('hidden');
                };
            });
        },

        onUploadProgress: function (ev) {
            if (ev.mediaItem) {
                this.state.mediaItem = ev.mediaItem;

                var imageWrapper = this.el.querySelector('.media-preview-thumbnail__image-wrapper');

                if (ev.mediaItem.type === 'video') {
                    // Videos will continue to process in the background. At this point we do not have a way
                    // to be notified when the poster image is ready. Instead we give the user a pacifier.
                    imageWrapper.innerHTML = '<p><i class="material-symbols-outlined">cloud_sync</i><br />Video upload complete.<br />The video will be available when the observation is submitted.</p>';
                } else {
                    // Image processing will be ready on demand.
                    var mediaURLs = (ev.mediaItem.mediaURLs && ev.mediaItem.mediaURLs.cdns) || [];
                    imageWrapper.innerHTML = '<img src="' + mediaURLs[0] + '?auto=format&width=640" alt="Image preview">';
                }

                // Enable the remove button which renders disabled by default
                this.getRemoveButton().disabled = false;
            } else {
                var icon = this.el.querySelector('.media-preview-thumbnail__image-wrapper i.material-symbols-outlined');

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
        },
    });



    function initializeObservationForm(form) {
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
            var state = { observation: observation };

            var props = {
                onSectionBack: onSectionBack,
                onSectionNext: onSectionNext,
                onSectionSave: onSectionSave,
            };

            switch (el.id) {
                case 'observation-form__section-1':
                    return new ObservationFormSectionBase(el, props, state);
                case 'observation-form__section-2':
                    return new ObservationFormSectionAvalanche(el, props, state);
                case 'observation-form__section-3':
                    return new ObservationFormSectionDetails(el, props, state);
                case 'observation-form__section-4':
                    return new ObservationFormSectionMedia(el, props, state);
                case 'observation-form__section-5':
                    return new ObservationFormSectionSubmit(el, props, state);
                case 'observation-form__section-6':
                    return new ObservationFormSectionThankYou(el, props, state);
            }

            return null;
        }

        function hideCurrentSection() {
            currentSection.unmount();
        }

        function showCurrentSection() {
            if (observation.isSaved()) {
                form.classList.remove('not-ready-to-save');
            }

            currentSection.mount();

            formIntro.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }

        function transitionBackward() {
            hideCurrentSection();

            currentSectionIndex = currentSectionIndex - 1;
            currentSection = sections[currentSectionIndex];

            if (!avalancheDetailsRequired && currentSection.isAvalancheFormSection()) {
                currentSectionIndex = currentSectionIndex - 1;
                currentSection = sections[currentSectionIndex];
            }

            showCurrentSection();
        }

        function transitionForward() {
            hideCurrentSection();

            currentSectionIndex = currentSectionIndex + 1;
            currentSection = sections[currentSectionIndex];

            if (!avalancheDetailsRequired && currentSection.isAvalancheFormSection()) {
                currentSectionIndex = currentSectionIndex + 1;
                currentSection = sections[currentSectionIndex];
            }

            showCurrentSection();
        }

        function onSectionBack() {
            var data = currentSection.validateInput();

            if (updateObservation(data)) {
                if (observation.isSaved() && !currentSection.isConfirmationSection()) {
                    observation.save();
                }

                if (typeof currentSection.areAvalancheDetailsRequired === 'function') {
                    avalancheDetailsRequired = currentSection.areAvalancheDetailsRequired();
                }

                transitionBackward();
            }
        }

        function onSectionNext() {
            var data = currentSection.validateInput();

            if (updateObservation(data)) {
                if (observation.isSaved() || currentSection.isSubmitSection()) {
                    observation.save();
                }

                if (typeof currentSection.areAvalancheDetailsRequired === 'function') {
                    avalancheDetailsRequired = currentSection.areAvalancheDetailsRequired();
                }

                transitionForward();
            }
        }

        function onSectionSave() {
            var data = currentSection.validateInput();
            if (updateObservation(data)) {
                observation.save();
            }
        }

        function updateObservation(data) {
            if (data) {
                if (data.media) {
                    observation.setMediaItems(data.media);
                } else {
                    observation.mergeFormData(data);
                }

                return true;
            }

            return false;
        }

        // Activate the first section.
        currentSection.mount();
    }

    function initializeTextArea(el) {
        el.oninput = function () {
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

    function uploadMedia(file, callback) {
        var id = file.type + file.size + file.name;
        var xhr = new XMLHttpRequest();

        xhr.responseType = 'json';

        xhr.onerror = function () {
            alert('Error event while uploading observation media');
        };

        xhr.onload = function onRequestComplete() {
            xhr.onerror = null;
            xhr.onload = null;

            if (xhr.status === 201 || xhr.status === 200) {
                var res = xhr.response;

                if (res.errors) {
                    var msg = (res.errors[0] || {}).detail || 'No server error message';
                    // eslint-disable-next-line no-console
                    console.log('error uploading observation media', res.errors);
                    alert('Error uploading observation media: ' + msg);
                } else {
                    callback({ id: id, progress: 1, mediaItem: res.data });
                }
            } else {
                alert('Unexpected status code: ' + xhr.status + 'while uploading observation media.');
            }
        };

        xhr.upload.addEventListener('progress', function onxhrprogress(ev) {
            var progress = ev.loaded / ev.total;
            callback({ id: id, progress: progress });
        });

        xhr.open('PUT', '/media/' + file.name);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);

        return xhr;
    }

    function sendJsonRPC(id, method, params, callback) {
        var body = JSON.stringify({
            jsonrpc: '2.0',
            id: id || generateUniqueId().toString(),
            method: method,
            params: params,
        });

        var xhr = new XMLHttpRequest();

        xhr.responseType = 'json';

        xhr.onload = function onRequestLoaded() {
            var res = xhr.response;

            if (res.error) {
                callback(res.error);
            } else {
                callback(null, res.result);
            }
        };

        xhr.open('POST', '/observations-rpc');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(body);
    }

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

    function noop() {}

    function findIndex(list, callback) {
        for (var i = 0; i < list.length; i += 1) {
            if (callback(list[i])) {
                return i;
            }
        }
        return -1;
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
