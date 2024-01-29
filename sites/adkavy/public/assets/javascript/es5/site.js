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
            console.log('xhr.response', xhr.response);
            var res = xhr.response;

            if (res.error) {
                // eslint-disable-next-line no-console
                console.log('JSON RPC Response:', res);
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

        xhr.open('PUT', '/observations/' + observation.id + '/media/' + file.name);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    }

    // Updates the title and detail attributes of an existing media item.
    function updateObservationMedia(observation, mediaItem, callback) {
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
                    console.log(res);
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
                // Media Item
                {
                    id: mediaItem.id,
                    title: mediaItem.title,
                    details: mediaItem.details,
                },
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

    function initializeObservationMediaUpload(el, observation) {
        var fileInput = el.querySelector('input[type="file"]');
        var selectFilesButtons = el.querySelectorAll('button.form-field__file-select-button');
        var thumbnailsContainer = el.querySelector('.media-input-field__thumbnails');
        var templateText = document.getElementById('template_image-card').innerHTML;

        function buildMediaCard(file) {
            var mediaItem;
            var wrapper = document.createElement('div');
            var removeButton;
            var uploadButton;

            wrapper.classList.add('media-preview-thumbnail');
            wrapper.innerHTML = templateText;

            function getFormData() {
                return {
                    title: wrapper.querySelector('input[name="photo_title"]').value,
                    details: wrapper.querySelector('textarea[name="photo_details"]').value,
                };
            }

            function onRemoveClick() {

                function onTransitionEnd() {
                    wrapper.removeEventListener('transitionend', onTransitionEnd);
                    wrapper.parentNode.removeChild(wrapper);

                    thumbnailsContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                }

                wrapper.addEventListener('transitionend', onTransitionEnd);
                wrapper.classList.add('hidden');
            }

            function onUploadClick() {
                removeButton.disabled = true;
                uploadButton.disabled = true;

                function whenFileUploaded(err, response) {
                    if (err) {
                        alert(err.message);
                    } else {
                        mediaItem = response;
                        updateObservationMetadata();
                    }
                }

                // If the observation has not been created yet, we will need to create it before we can
                // attach media to it.
                if (!observation.id) {
                    updateOrCreateObservation(observation, function whenObservationCreated() {
                        uploadMediaFile(observation, file, whenFileUploaded);
                    });
                } else {
                    uploadMediaFile(observation, file, whenFileUploaded);
                }
            }

            function updateObservationMetadata() {
                var formData = getFormData();

                mediaItem.title = formData.title;
                mediaItem.details = formData.details;

                updateObservationMedia(observation, mediaItem, whenObservationUpdated);
            }

            function whenObservationUpdated(error) {
                if (error) {
                    alert(error.message);
                }

                uploadButton.disabled = false;
                uploadButton.querySelector('.button__label').innerText = 'Update Photo Info';

                uploadButton.onclick = updateObservationMetadata;
            }

            // Wait for a turn of the event loop before querying the
            // newly rendered DOM.
            setTimeout(function whenRendered() {
                removeButton = wrapper.querySelector('.media-preview-thumbnail__remove-button');
                uploadButton = wrapper.querySelector('.media-preview-thumbnail__upload-button');

                wrapper.querySelector('img').src = URL.createObjectURL(file);

                removeButton.onclick = onRemoveClick;
                uploadButton.onclick = onUploadClick;
            });


            return wrapper;
        }

        function hideInitialInputAction(callback) {
            var target = el.querySelector('.form-field__file-input-action');

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
        }

        function collapseInitialInputAction() {
            var target = el.querySelector('.form-field__file-input-action');
            target.classList.add('collapsed');
        }

        function showMediaCards() {
            thumbnailsContainer.classList.add('active');
        }

        function showAddMoreButton() {
            el.querySelector('.media-input-field__add-more').classList.add('active');
        }

        selectFilesButtons.forEach(function addButtonClickHandler(button) {
            button.onclick = function onSelectFilesClicked() {
                fileInput.click();
            };
        });

        // When the user has selected file(s).
        fileInput.oninput = function onSelectFilesInput() {
            var mediaCards = [];

            for (var i = 0; i < fileInput.files.length; i = i + 1) {
                mediaCards.push(buildMediaCard(fileInput.files[i]));
            }

            // Hide the button which initially triggered the file selector.
            hideInitialInputAction(function renderImageCards() {
                mediaCards.forEach(function appendNode(node) {
                    thumbnailsContainer.appendChild(node);
                });

                collapseInitialInputAction();
                showMediaCards();
                showAddMoreButton();
            });
        };
    }

    var FormSectionPrototype = {

        bindHandlers: function bindHandlers(onSectionBack, onSectionNext) {
            this.onSectionBack = onSectionBack;
            this.onSectionNext = onSectionNext;

            this.backButton = this.el.querySelector('.observation-form__back-button');
            this.nextButton = this.el.querySelector('.observation-form__next-button');

            if (this.backButton) {
                this.backButton.addEventListener('click', this.onSectionBack);
            }

            if (this.nextButton) {
                this.nextButton.addEventListener('click', this.onSectionNext);
            }
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

    function ObservationFormSectionPhotos(el) {
        this.el = el;
        this.id = el.id;
    }

    extendObject(ObservationFormSectionPhotos.prototype, FormSectionPrototype);

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

    function createFormSection(el) {
        switch (el.id) {
            case 'observation-form__section-1':
                return new ObservationFormSectionBase(el);
            case 'observation-form__section-2':
                return new ObservationFormSectionAvalanche(el);
            case 'observation-form__section-3':
                return new ObservationFormSectionDetails(el);
            case 'observation-form__section-4':
                return new ObservationFormSectionPhotos(el);
            case 'observation-form__section-5':
                return new ObservationFormSectionSubmit(el);
            case 'observation-form__section-6':
                return new ObservationFormSectionThankYou(el);
        }

        return null;
    }

    function initializeObservationForm(form) {
        var AVALANCHE_DETAILS_SECTION_ID = 'observation-form__section-2';

        var formIntro = document.getElementById('top-of-form');
        var formSectionNodes = form.querySelectorAll('.form-section');

        var sections = mapNodes(formSectionNodes, createFormSection);

        var currentSectionIndex = 0;
        var currentSection = sections[currentSectionIndex];
        var avalancheDetailsRequired = false;

        var observation = new Observation();

        // Prevent form submission when back <> next buttons are clicked.
        form.addEventListener('submit', function onObservationFormSubmit(ev) {
            ev.preventDefault();
            ev.stopPropagation();
        });

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

        function onSectionBack() {
            if (observation.id) {
                updateOrCreateObservation(observation);
            }
            transitionBackward();
        }

        function onSectionNext(ev) {
            var data = currentSection.validateInput();

            if (data) {
                if (observation.id || ev.target.getAttribute('data-submit')) {
                    updateOrCreateObservation(observation);
                }

                observation.mergeFormData(data);

                if (typeof currentSection.areAvalancheDetailsRequired === 'function') {
                    avalancheDetailsRequired = currentSection.areAvalancheDetailsRequired();
                }

                transitionForward();
            }
        }

        // Activate the first section.
        currentSection.bindHandlers(onSectionBack, onSectionNext);

        // Initialize the photo upload controller once.
        initializeObservationMediaUpload(
            document.getElementById('observation-form__photos-field'),
            observation
        );
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
        console.log('new data =>', newData);
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
