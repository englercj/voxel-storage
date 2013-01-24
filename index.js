var events = require('events'),
    util = require('util'),
    IDBStore = require('idb-wrapper');

module.exports = function(opts) {
  return new Storage(opts)
}

var Storage = function(opts) {
    events.EventEmitter.call(this);

    if(typeof opts === 'string') opts = { storeName: opts };

    opts = opts || {};

    //our schema version, no user override here
    opts.dbVersion = 1;

    //the underlying wrapper defaults storePrefix to 'IDBWrapper-'
    //so I override that default with a default of ''
    opts.storePrefix = opts.storePrefix || '';

    //default keyPath
    opts.keyPath = opts.keyPath || 'id';

    //setup an index on the type
    opts.indexes = opts.indexes || [];
    opts.indexes.push({ name: 'type', keyPath: 'type', unique: false, multiEntry: false });

    //put outselves as the ready callback, but store the user's too
    this.rdyCb = opts.onStoreReady || opts.onReady;
    opts.onStoreReady = this._onReady.bind(this);

    //same as above but for the error callback
    this.errCb = opts.onStoreError || opts.onError;
    opts.onError = this._onError.bind(this, this.errCb);

    //queue calls to the database that happen before we are
    //actually ready to interact with the store
    this.ready = false;
    this.queue = [];

    //connect to IDB store
    this.store = new IDBStore(opts);
};

util.inherits(Storage, events.EventEmitter);

/****************************
    Loading Functions
*/

Storage.prototype.loadChunk = function(id, cb) {
    this._load('chunk', id, cb);
};

Storage.prototype.loadChunks = function(ids, cb) {
    if(typeof ids === 'function') {
        cb = ids;
        ids = null;
    }

    //load each chunk within the IDs passed
    this._loadEach('chunk', ids, cb);
};

Storage.prototype.loadItem = function(id, cb) {
    this._load('item', id, cb);
};

Storage.prototype.loadItems = function(ids, cb) {
    if(typeof ids === 'function') {
        cb = ids;
        ids = null;
    }

    //load each item within the IDs passed
    this._loadEach('item', ids, cb);
};

Storage.prototype.loadPlayer = function(cb) {
    this._load('player', 'player', cb);
};

Storage.prototype.loadGame = function(cb) {
    throw 'Not yet implemented!';
};

/****************************
    Storing Functions
*/

Storage.prototype.storeChunk = function(chunk, cb) {
    this._store('chunk', chunk.position.join('|'), chunk, cb);
};

Storage.prototype.storeChunks = function(chunks, cb) {
    this._storeEach('chunk', chunks, cb);
};

Storage.prototype.storeItem = function(item, cb) {
    this._store('item', item.position.join('|'), item, cb);
};

Storage.prototype.storeItems = function(items, cb) {
    this._storeEach('item', items, cb);
};

Storage.prototype.storePlayer = function(player, cb) {
    this._store('player', 'player', player, cb);
};

Storage.prototype.storeGame = function(game, cb) {
    throw 'Not yet implemented!';
};

/****************************
    Export/Import Functions
*/

Storage.prototype.export = function(cb) {
    //create and return Data URI
    var self = this;

    this.store.getAll(
        function(data) {
            var blob = new Blob(data, { 'type': 'application/json' });
            self.emit('exported', blob);
            if(cb) cb(null, blob);
        },
        this._onError.bind(this, cb)
    );
};

/****************************
    Private and Helper Functions
*/

Storage.prototype._load = function(type, id, cb) {
    var self = this
    this.store.get(
        type + '_' + id,
        function(data) {
            self.emit(type + 'Loaded', data.value)
            if(cb) cb(null, data.value);
        },
        this._onError.bind(this, cb)
    );
};

Storage.prototype._loadEach = function(type, ids, cb) {
    if(typeof ids === 'function') {
        cb = ids;
        ids = null;
    }

    var self = this,
        res = [];

    ids = ids || [];

    //return all entries of a certain type
    this.store.iterate(
        function(data, cursor, trans) {
            //done iterating
            if(data === null) {
                self.emit(type + 'sLoaded', res);
                if(cb) cb(null, res);
            } else {
                if(!ids || ids.indexOf(data.id) !== -1) {
                    res.push(data.value);
                    self.emit(type + 'Loaded', data.value);
                }
            }
        },
        {
            index: 'type',
            keyRange: IDBKeyRange.only(type),
            //order: '',
            //filterDuplicates: '',
            //writeAccess: '',
            onError: this._onError.bind(this, cb)
        }
    );
};

Storage.prototype._store = function(type, id, value, cb) {
    var self = this
    this.store.put(
        {
            id: type + '_' + id,
            type: type,
            value: value
        },
        function(id) {
            self.emit(type + 'Stored', id);
            if(cb) cb(null, id);
        },
        this._onError.bind(this, cb)
    );
};

Storage.prototype._storeEach = function(type, values, cb) {
    var self = this
    var actions = [];
    for(var i = 0, il = values.length; i < il; ++i) {
        actions.push({
            type: 'put',
            value: {
                id: type + '_' + values[i].position.join('|'),
                type: type,
                value: values[i]
            }
        });
    }

    this.store.batch(
        actions,
        function() {
            self.emit(type + 'sStored');
            if(cb) cb()
        },
        this._onError.bind(this, cb)
    );
};

//ready callback for IDBStore
Storage.prototype._onReady = function() {
    this.ready = true;

    //process the queue
    for(var i = 0, il = this.queue.length; i < il; ++i) {
        this[this.queue[i][0]].apply(this, this.queue[i][1]);
    }
    this.queue.length = 0;

    if(this.rdyCb) this.rdyCb();
};

//error callback for IDBStore
Storage.prototype._onError = function(cb, err) {
    this.emit('error', err);
    if(cb) cb(err);
};

//queue an action to be processed later (on ready)
Storage.prototype._enqueue = function(fname, args) {
    this.queue.push([fname, args]);
};

//Wrap all of our public API functions to accomplish 2 thngs any time a function is called:
//  1. If we are not ready to talk to IDB, queue the call to be processed later, and
//  2. Always return 'this' so that methods are chainable
for(var f in Storage.prototype) {
    //don't wrap helpers
    if(f.indexOf('_') === 0) continue;

    (function(f) {
        var fn = Storage.prototype[f];
        Storage.prototype[f] = function() {
            if(!this.ready) this._enqueue(f, arguments);
            else fn.apply(this, arguments);

            return this;
        };
    })(f);
}