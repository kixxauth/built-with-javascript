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

    function showAlert(el, timeout) {
        el.classList.add('alert--active');

        if (timeout) {
            setTimeout(function hideAlert() {
                el.classList.remove('alert--active');
            }, timeout);
        }
    }

    function uploadImageFile(file, callback) {
        var xhr = new XMLHttpRequest();

        xhr.responseType = 'json';

        xhr.onerror = callback;

        xhr.onload = function onRequestComplete() {
            xhr.onerror = null;
            xhr.onload = null;

            if (xhr.status === 201) {
                callback(null, xhr.response);
            } else {
                callback(new Error('Unexpected status code: ' + xhr.status));
            }
        };

        xhr.open('POST', '/images/');
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    }

    function addObservationPhoto(observationId, photoAttributes, callback) {
        var xhr = new XMLHttpRequest();

        xhr.responseType = 'json';

        xhr.onerror = callback;

        xhr.onload = function onRequestComplete() {
            xhr.onerror = null;
            xhr.onload = null;

            if (xhr.status === 201) {
                callback(null, xhr.response);
            } else {
                callback(new Error('Unexpected status code: ' + xhr.status));
            }
        };

        xhr.open('PUT', '/observations/' + observationId + '/photos/' + photoAttributes.id);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(photoAttributes));
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

    function initializeObservationPhotoUpload(el, observation) {
        var fileInput = el.querySelector('input[type="file"]');
        var selectFilesButtons = el.querySelectorAll('button.form-field__file-select-button');
        var thumbnailsContainer = el.querySelector('.media-input-field__thumbnails');
        var templateText = document.getElementById('template_image-card').innerHTML;
        var files = [];

        function buildImageCard(file) {
            var photo;
            var wrapper = document.createElement('div');
            var removeButton;
            var uploadButton;

            files.push(file);

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

                    var index = files.indexOf(file);
                    files.splice(index, 1);

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

                uploadImageFile(file, function whenFileUploaded(err, response) {
                    if (err) {
                        alert(err.message);
                    } else {
                        photo = response;
                        updateObservationPhoto();
                    }
                });
            }

            function updateObservationPhoto() {
                var formData = getFormData();

                photo.title = formData.title;
                photo.details = formData.details;

                addObservationPhoto(observation.id, photo, whenObservationUpdated);
            }

            function whenObservationUpdated(error) {
                if (error) {
                    alert(error.message);
                }

                uploadButton.disabled = false;
                uploadButton.querySelector('.button__label').innerText = 'Update Photo Info';

                uploadButton.onclick = updateObservationPhoto;
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

        function showImageCards() {
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
            var imageCards = [];

            for (var i = 0; i < fileInput.files.length; i = i + 1) {
                imageCards.push(buildImageCard(fileInput.files[i]));
            }

            // Hide the button which initially triggered the file selector.
            hideInitialInputAction(function renderImageCards() {
                imageCards.forEach(function appendNode(node) {
                    thumbnailsContainer.appendChild(node);
                });

                collapseInitialInputAction();
                showImageCards();
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
                travelMode: document.getElementById('observation-form__travel_mode').value,
                observationType: this.getObservationType(),
                location: document.getElementById('observation-form__location').value,
                title: document.getElementById('observation-form__title').value,
            };
        },

        validateInput: function validateInput() {
            this.values = this.getValues();

            if (!this.values.date || !this.values.location || !this.values.title) {
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

            if (!values.avalancheType || !values.avalancheSize || !values.avalancheComments) {
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
                time: document.getElementById('observation-form__time').value,
                elevation: document.getElementById('observation-form__elevation').value,
                aspect: this.el.querySelector('select[name="aspect"]').value,
                redFlags: this.getRedFlags(),
                details: document.getElementById('observation-form__details').value,
            };
        },

        validateInput: function validateInput() {
            var values = this.getValues();

            if (!values.time || !values.details) {
                showAlert(this.el.querySelector('.alert'), 4000);
                return false;
            }

            return values;
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
            transitionBackward();
        }

        function onSectionNext() {
            var data = currentSection.validateInput();

            if (data) {
                observation.mergeFormData(data);
                createOrUpdateObservation();

                if (typeof currentSection.areAvalancheDetailsRequired === 'function') {
                    avalancheDetailsRequired = currentSection.areAvalancheDetailsRequired();
                }

                transitionForward();
            }
        }

        function createOrUpdateObservation() {
            var xhr = new XMLHttpRequest();

            xhr.responseType = 'json';

            xhr.onload = function onRequestLoaded() {
                observation.id = (xhr.response || {}).id;
            };

            if (observation.id) {
                xhr.open('PUT', '/observations/' + observation.id);
            } else {
                xhr.open('POST', '/observations/');
            }

            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(observation));
        }

        // Activate the first section.
        currentSection.bindHandlers(onSectionBack, onSectionNext);

        // Initialize the photo upload controller once.
        initializeObservationPhotoUpload(
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
        this.date = '';
        this.time = '';
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
        this.date = this.formData.date || '';

        if (this.formData.time) {
            this.time = this.formatTime(this.formData.time);
        }

        this.travelMode = this.formData.travelMode;
        this.location = this.formData.location || '';
        this.elevation = this.formData.elevation || '';
        this.aspect = this.formData.aspect || '';
        this.details = this.formData.details || '';
        this.redFlags = this.formData.redFlags || [];

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

    Observation.prototype.formatTime = function formatTime(timeString) {
        var parts = timeString.split(':');
        var hours = parseInt(parts[0], 10);
        var minutes = parseInt(parts[1], 10);
        var postfix = 'AM';

        if (hours > 11) {
            postfix = 'PM';
        }

        if (hours === 0) {
            hours = 12;
        } else if (hours > 12) {
            hours = hours - 12;
        }

        return padNumber(hours) + ':' + padNumber(minutes) + ':00 ' + postfix;
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
