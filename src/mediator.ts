
type callbackType = {
    (...args: any[]): void;
    _cb?: Function
}

interface EventHandler {
    name: string;
    cb: callbackType;
    ctx: any;
    ctx2: any;
}


export class Mediator {
    private events: EventHandler[] = [];
    private findEventIndex(name: string, callback?: callbackType, context?: any) {
        return this.events.findIndex(
            (item) => name === item.name && (!callback || item.cb === callback || item.cb._cb === callback) && (!context || item.ctx === context),
        );
    }
    private findEvents(name: string, callback?: () => void, context?: any) {
        return this.events.filter(
            (item) => name === item.name && (!callback || item.cb === callback || item.cb._cb === callback) && (!context || item.ctx === context),
        );
    }
    private triggerHanders(events: EventHandler[], args: any[]) {
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
    private createEventHandler(name: string, callback: callbackType, context?: any) {
        return {
            name,
            cb: callback,
            ctx: context,
            ctx2: context || this,
        }
    }
    on(name: string | string[], callback: callbackType, context?: any) {
        if (typeof name === 'string') {
            this.events.push(this.createEventHandler(name, callback, context))
        } else {
            name.forEach(n => {
                this.events.push(this.createEventHandler(n, callback, context))
            })
        }

        return this;
    }
    once(name: string | string[], callback: callbackType, context?: any) {
        if (typeof name !== 'string') {
            name.forEach(n => this.once(n, callback, context))
        }
        const once = (...args: any[]) => {
            this.off(name, once);
            return callback.apply(context || this, args);
        };

        once._cb = callback;
        this.on(name, once, context);

        return this;
    }
    off(name?: string | string[], callback?: () => {}, context?: any) {
        if (!this.events.length) {
            return this;
        }

        if (!name && !callback && !context) {
            this.events = [];
            return this;
        }

        const names = typeof name === 'string' ? [name] : name;
        names.forEach(n => {
            const index = this.findEventIndex(n, callback, context);
            if (index !== -1) {
                this.events.splice(index, 1);
            }
        })

        return this;
    }
    trigger(name: string, ...args: any[]) {
        if (!this.events.length || !name) {
            return this;
        }

        const events = this.findEvents(name);

        return this.triggerHanders(events, args);
    }
}

