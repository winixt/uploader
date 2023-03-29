interface callbackType {
  (...args: any[]): any
  _cb?: (...args: any[]) => any
}

interface EventHandler {
  name: string
  cb: callbackType
}

export class Mediator {
  private events: EventHandler[] = []
  private findEventIndex(name?: string, callback?: callbackType) {
    if (!name)
      return -1
    return this.events.findIndex(
      item =>
        name === item.name
                && (!callback || item.cb === callback || item.cb._cb === callback),
    )
  }

  private findEvents(name: string, callback?: () => void) {
    return this.events.filter(
      item =>
        name === item.name
                && (!callback || item.cb === callback || item.cb._cb === callback),
    )
  }

  private triggerHandlers(events: EventHandler[], args: any[]) {
    let stopped = false
    let i = -1
    const len = events.length

    while (++i < len) {
      const handler = events[i]

      if (handler.cb(...args)) {
        stopped = true
        break
      }
    }

    return !stopped
  }

  private createEventHandler(name: string, callback: callbackType) {
    return {
      name,
      cb: callback,
    }
  }

  on(name: string, callback: callbackType) {
    this.events.push(this.createEventHandler(name, callback))
    return this
  }

  once(name: string, callback: callbackType) {
    const once = (...args: any[]) => {
      this.off(name, once)
      return callback(...args)
    }

    once._cb = callback
    this.on(name, once)

    return this
  }

  off(name?: string, callback?: callbackType) {
    if (!this.events.length)
      return this

    if (!name && !callback) {
      this.events = []
      return this
    }
    const index = this.findEventIndex(name, callback)
    if (index !== -1)
      this.events.splice(index, 1)

    return this
  }

  trigger(name: string, ...args: any[]) {
    if (!this.events.length || !name)
      return this

    const events = this.findEvents(name)

    return this.triggerHandlers(events, args)
  }
}
