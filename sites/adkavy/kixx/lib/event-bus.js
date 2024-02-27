import Errors from '../errors/mod.js';

const { WrappedError, isHttpError } = Errors;


export default class EventBus {
    #listeners = new Map();

    on(eventName, fn) {
        const listeners = this.#getOrCreateListeners(eventName);

        // Set the handler as the key, and `once` boolean as the value.
        listeners.set(fn, false);

        return this;
    }

    once(eventName, fn) {
        const listeners = this.#getOrCreateListeners(eventName);

        // Set the handler as the key, and `once` boolean as the value.
        listeners.set(fn, true);

        return this;
    }

    off(eventName, fn) {
        if (eventName && fn) {
            const listeners = this.#listeners.get(eventName);
            if (listeners) {
                listeners.delete(fn);
                if (listeners.size === 0) {
                    this.#listeners.delete(eventName);
                }
            }
        } else if (eventName) {
            this.#listeners.delete(eventName);
        } else {
            this.#listeners.clear();
        }

        return this;
    }

    emit(eventName, event) {
        const listeners = this.#listeners.get(eventName);

        if (!listeners) {
            return this;
        }

        let error;

        listeners.forEach((once, fn) => {
            if (once) {
                listeners.delete(fn);
            }

            try {
                fn(event);
            } catch (err) {
                error = err;
            }
        });

        // Remove the listeners Map if all listeners have been removed.
        if (listeners.size === 0) {
            this.#listeners.delete(eventName);
        }

        if (error) {
            // Emit listener errors unless this is an "error" event (to avoid infinite loops).
            if (eventName === 'error') {
                throw error;
            }

            this.emitError(error);
        }

        return this;
    }

    emitError(cause) {
        if (isHttpError(cause)) {
            // Just pass through HTTP errors without wrapping them.
            this.emit('error', cause);
        } else {
            // Wrapping the error allows us to capture the point at which the error event was emitted
            // as part of the stack trace.
            const sourceFunction = this.emitError;
            const fatal = cause.fatal || !(cause instanceof WrappedError);
            const code = cause.code;
            const error = new WrappedError('EventBus emitted error', { code, cause, fatal }, sourceFunction);
            this.emit('error', error);
        }
    }

    #getOrCreateListeners(eventName) {
        let listeners = this.#listeners.get(eventName);

        if (!listeners) {
            listeners = new Map();
            this.#listeners.set(eventName, listeners);
        }

        return listeners;
    }
}
