export class Mediator {
    _events = [];
    _findEventIndex(name, callback, context) {
        return this._events.findIndex(
            (item) => name === item.name && (!callback || item.cb === callback || item.cb._cb === callback) && (!context || item.ctx === context),
        );
    }
    _findEvents(name, callback, context) {
        return this._events.filter(
            (item) => name === item.name && (!callback || item.cb === callback || item.cb._cb === callback) && (!context || item.ctx === context),
        );
    }
    _triggerHanders(events, args) {
        let stoped = false;
        let i = -1;
        const len = events.length;

        while (++i < len) {
            const handler = events[i];

            if (handler.cb.apply(handler.ctx2, args) === false) {
                stoped = true;
                break;
            }
        }

        return !stoped;
    }
    on(name, callback, context) {
        if (!callback) {
            return this;
        }

        const handler = { e: name };

        handler.cb = callback;
        handler.ctx = context;
        handler.ctx2 = context || this;

        this._events.push(handler);

        return this;
    }
    once(name, callback, context) {
        if (!callback) {
            return this;
        }

        const once = (...args) => {
            this.off(name, once);
            return callback.apply(context || this, args);
        };

        once._cb = callback;
        this.on(name, once, context);

        return this;
    }
    off(name, cb, ctx) {
        const events = this._events;

        if (!events.length) {
            return this;
        }

        if (!name && !cb && !ctx) {
            this._events = [];
            return this;
        }

        const index = this._findEventIndex(name, cb, ctx);
        if (index !== -1) {
            this._events.splice(index, 1);
        }

        return this;
    }
    trigger(name, ...args) {
        if (!this._events.length || !name) {
            return this;
        }

        const events = this._findEvents(name);

        return this._triggerHanders(events, args);
    }
}

export default new Mediator();
