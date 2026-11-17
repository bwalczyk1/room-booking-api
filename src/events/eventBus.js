const { EventEmitter } = require("node:events");

// emit() w EventEmitter jest synchroniczny: wyjątek z listenera trafiłby do service, a odrzucony Promise
// listenera async zakończyłby proces. Dlatego listenery uruchamiamy osobno i łapiemy ich błędy
function createEventBus() {
  const emitter = new EventEmitter();

  return {
    publish(eventName, payload) {
      emitter.emit(eventName, { name: eventName, occurredAt: new Date().toISOString(), payload });
    },

    subscribe(eventName, handler) {
      emitter.on(eventName, event => {
        Promise.resolve()
          .then(() => handler(event))
          .catch(err => console.error(`[event:${eventName}] handler failed`, err));
      });
    }
  };
}

// Null object - domyślny event bus, gdy nikt nie przekaże prawdziwego (np. w testach)
const noopEventBus = { publish() {}, subscribe() {} };

module.exports = { createEventBus, noopEventBus };
