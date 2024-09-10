(() => {
    "use strict";

    // Utility function to handle asynchronous operations
    const asyncHandler = (executor, resolve, reject, generatorFunction) => {
        return new (resolve || (resolve = Promise))((function (resolveFunc, rejectFunc) {
            function step(result) {
                try { process(generatorFunction.next(result)) }
                catch (error) { rejectFunc(error) }
            }
            function errorStep(error) {
                try { process(generatorFunction.throw(error)) }
                catch (error) { rejectFunc(error) }
            }
            function process(result) {
                var value;
                result.done ? resolveFunc(result.value) :
                    (value = result.value, value instanceof resolve ? value : new resolve((resolveFunc) => { resolveFunc(value) }))
                        .then(step, errorStep)
            }
            process((generatorFunction = generatorFunction.apply(executor, resolve || [])).next())
        }))
    };

    // Utility functions to get elements by selector
    const getElements = (selector, parent = document.body) => {
        const elements = [].slice.call(parent.querySelectorAll(selector));
        if (elements.length === 0) throw new Error(`GET_ELEMENTS: ${parent.id} -> ${selector}`);
        return elements;
    };

    const getElement = (selector, parent = document.body) => {
        const element = parent.querySelector(selector);
        if (!element) throw new Error(`GET_ELEMENT: ${parent.id} -> ${selector}`);
        return element;
    };

    // Enum for validation types
    var ValidationType;
    (function (ValidationType) {
        ValidationType.required = "required";
        ValidationType.email = "email";
        ValidationType.length = "length";
        ValidationType.checked = "checked";
        ValidationType.phone = "phone"
    })(ValidationType || (ValidationType = {}));

    // Form validation class
    class FormFieldValidator {
        constructor(inputField, validationTypes, onChangeCallback) {
            this.inputField = inputField;
            this.validationTypes = validationTypes;
            this.onChangeCallback = onChangeCallback;
            this.isInitial = true;
            this.inputBlurHandler = () => this.handleBlur();
            this.inputInputHandler = () => this.handleInput();
            this.inputClickHandler = () => this.handleClick();
            inputField.addEventListener("blur", this.inputBlurHandler);
            inputField.addEventListener("input", this.inputInputHandler);
            inputField.addEventListener("click", this.inputClickHandler);
        }

        handleBlur() { this.isInitial = false; this.performValidation() }
        handleInput() { this.performValidation() }
        handleClick() { this.performValidation() }

        initValidation() { this.performValidation() }

        performValidation() {
            let isValid = true;
            this.validationTypes.forEach(validationType => {
                isValid = isValid && runValidation(this.inputField, validationType)
            });

            const isCheckboxOrRadio = isCheckboxOrRadioInput(this.inputField);
            if (isCheckboxOrRadio) {
                const container = this.inputField.parentElement.parentElement;
                const relatedInputs = getElements("input", container);

                if (isValid) {
                    relatedInputs.forEach(input => input.dataset.canSubmit = "yes");
                    if (this.isInitial) return this.onChangeCallback(), void (this.isInitial = false);
                    container.firstElementChild.classList.remove("is-invalid");
                } else {
                    relatedInputs.forEach(input => input.dataset.canSubmit = "no");
                    if (this.isInitial) return this.onChangeCallback(), void (this.isInitial = false);
                    container.firstElementChild.classList.add("is-invalid");
                }
            } else {
                if (isValid) {
                    this.inputField.dataset.canSubmit = "yes";
                    if (this.isInitial) return void this.onChangeCallback();
                    this.inputField.classList.remove("is-invalid");
                } else {
                    this.inputField.dataset.canSubmit = "no";
                    if (this.isInitial) return void this.onChangeCallback();
                    this.inputField.classList.add("is-invalid");
                }
            }
            this.onChangeCallback();
        }

        reset() {
            this.isInitial = true;
            const isCheckboxOrRadio = isCheckboxOrRadioInput(this.inputField);
            if (isCheckboxOrRadio) {
                const container = this.inputField.parentElement.parentElement;
                const relatedInputs = getElements("input", container);
                container.firstElementChild.classList.remove("is-invalid");
                relatedInputs.forEach(input => {
                    input.dataset.canSubmit = "no";
                    input.checked = false;
                });
            } else {
                this.inputField.value = "";
                this.inputField.classList.remove("is-invalid");
                this.inputField.dataset.canSubmit = "no";
            }
        }

        tearDown() {
            this.reset();
            this.inputField.removeEventListener("blur", this.inputBlurHandler);
            this.inputField.removeEventListener("input", this.inputInputHandler);
            this.inputField.removeEventListener("click", this.inputClickHandler);
        }
    }

    const isCheckboxOrRadioInput = inputField => !!["checkbox", "radio"].includes(inputField.type);

    const runValidation = (inputField, validationType) => {
        let isValid = true;
        let feedbackElement;
    
        // Handle required validation first
        if (validationType === ValidationType.required) {
            isValid = isCheckboxOrRadioInput(inputField)
                ? getElements("input", inputField.parentElement.parentElement).some(input => input.checked)
                : inputField.value !== "";
    
            feedbackElement = getElement(`[data-sb-feedback="${inputField.id}:${validationType}"]`);
    
            if (!isValid) {
                feedbackElement.classList.remove("d-none");
                // Hide any other validation messages
                hideOtherFeedback(inputField, ValidationType.required);
                return false;
            } else {
                feedbackElement.classList.add("d-none");
            }
        }
    
        // Handle other validations only if the field is not empty (required validation passed)
        if (inputField.value !== "") {
            switch (validationType) {
                case ValidationType.email:
                    isValid = validateEmail(inputField.value);
                    break;
                case ValidationType.length:
                    isValid = validateLength(inputField.value);
                    break;
                case ValidationType.checked:
                    isValid = inputField.checked;
                    break;
                case ValidationType.phone:
                    isValid = validatePhone(inputField.value);
                    break;
                default:
                    isValid = true;
                    break;
            }
    
            feedbackElement = getElement(`[data-sb-feedback="${inputField.id}:${validationType}"]`);
            
            if (!isValid) {
                feedbackElement.classList.remove("d-none");
            } else {
                feedbackElement.classList.add("d-none");
            }
        }
    
        return isValid;
    };
    
    // Helper function to hide all other feedback messages except the required one
    const hideOtherFeedback = (inputField, excludeValidationType) => {
        const allFeedbackElements = document.querySelectorAll(`[data-sb-feedback^="${inputField.id}:"]`);
        allFeedbackElements.forEach(feedback => {
            const feedbackType = feedback.getAttribute('data-sb-feedback').split(':')[1];
            if (feedbackType !== excludeValidationType) {
                feedback.classList.add("d-none");
            }
        });
    };

    const validateEmail = email => /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(email).toLowerCase());

    const validateLength = value => value.length > 8;

    const validatePhone = (phone) => {
        if (typeof phone !== 'string' && phone !== null && phone !== undefined) {
            phone = String(phone);  
        } 
        const regex = /^(\+?61|0)[2-478](\s?\d){8}$/;
        return regex.test(phone);
    };

    // Injecting CSS styles dynamically
    (() => {
        const styleElement = document.createElement("style");
        styleElement.textContent = `
            .d-none {
                display: none;
            }
            .invalid-feedback {
                display: none;
            }
            .btn.disabled {
                pointer-events: none;
                opacity: 0.65;
            }
        `;
        document.head.append(styleElement);
    })();

    window.addEventListener("DOMContentLoaded", () => {
        getElements("form[data-sb-form-api-token]").forEach(form => initializeForm(form));
    });

    const sbForms = { initializeForm: (form, additionalElements) => initializeForm(form, additionalElements) };
    window.sbForms = sbForms;

    const initializeForm = (formElement, additionalElements) => {
        let formIsActive = true;
        const validators = [];
        const updateSubmitButtonState = () => { checkFormValidity() };
        const submitButton = getElement("#submitButton", formElement);
        const successMessage = getElement("#submitSuccessMessage", formElement);
        const errorMessage = getElement("#submitErrorMessage", formElement);
        const inputsToValidate = additionalElements || getElements("input, textarea, select", formElement);

        inputsToValidate.forEach(inputField => {
            const validationData = inputField.dataset.sbValidations;
            if (validationData) {
                inputField.dataset.canSubmit = "no";
                validators.push(new FormFieldValidator(inputField, validationData.split(",").map(v => v.trim()), updateSubmitButtonState));
            } else {
                inputField.dataset.canSubmit = "yes";
            }
        });

        const handleSubmit = event => {
            return asyncHandler(undefined, undefined, undefined, function* () {
                event.preventDefault();
                submitButton.classList.add("d-none");

                try {
                    const formData = collectFormData(inputsToValidate);
                    // EmailJS Email Sending Logic
                    yield sendEmailUsingEmailJS(formData);

                    successMessage.classList.remove("d-none");
                    inputsToValidate.forEach(inputField => inputField.setAttribute("disabled", ""));
                } catch (error) {
                    console.error(error);
                    errorMessage.classList.remove("d-none");
                }
            });
        };

        submitButton.addEventListener("click", handleSubmit);

        const checkFormValidity = () => {
            const formIsValid = inputsToValidate.reduce((isValid, inputField) => {
                const isCheckboxOrRadio = isCheckboxOrRadioInput(inputField);
                if (isCheckboxOrRadio) {
                    const container = inputField.parentElement.parentElement;
                    const relatedInputs = getElements("input", container);
                    return isValid && relatedInputs.some(input => input.dataset.canSubmit === "yes");
                }
                return isValid && inputField.dataset.canSubmit === "yes";
            }, true);

            if (formIsValid) {
                submitButton.classList.remove("disabled");
            } else {
                submitButton.classList.add("disabled");
            }
        };

        return validators.forEach(validator => validator.initValidation()), checkFormValidity(), {
            tearDown: () => {
                submitButton.removeEventListener("click", handleSubmit);
                successMessage.classList.add("d-none");
                errorMessage.classList.add("d-none");
                submitButton.classList.remove("d-none");
                submitButton.classList.add("disabled");
                inputsToValidate.forEach(inputField => { inputField.removeAttribute("disabled") });
                validators.forEach(validator => validator.tearDown());
            }
        }
    };

    const collectFormData = inputs => {
        const formData = {};
        inputs.forEach(inputField => {
            if (["checkbox", "radio"].includes(inputField.type)) {
                formData[inputField.name] = inputField.checked;
            } else {
                formData[inputField.id] = inputField.value;
            }
        });
        return formData;
    };

    const sendEmailUsingEmailJS = formData => {
        // Replace the following with your EmailJS service ID, template ID, and user ID
        const serviceID = "aster_auto_web_emailjs";
        const templateID = "aster_auto_web_emailTemp";
        const {name,email, phone, message}=formData;
        const emailMessage=`User name: ${name} \n User email: ${email} \n User phone: ${phone} \n send a message to you : \n ${message}`
        var templateParams = {
            from_name: name,
            to_name: "Aster Auto",
            message: emailMessage,
          };
          
          emailjs.send(serviceID, templateID, templateParams).then(
            (response) => {
              console.log('SUCCESS!', response.status, response.text);
            },
            (error) => {
              console.log('FAILED...', error);
            },
          );
    };

})();
