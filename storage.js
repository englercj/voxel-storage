var voxel = require('voxel'),
    IDBStore = require('idb-wrapper');

var Storage = module.exports = function(opts) {
    if(typeof opts === 'string') opts = { storeName: otps };

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

    //put outselves as the ready callback, but save the user's too
    this.rdyCb = opts.onStoreReady || opts.onReady;
    opts.onStoreReady = this._onReady.bind(this);

    //same as above but for the error callback
    this.errCb = opts.onStoreError || opts.onError;
    opts.onError = this._onError.bind(this);

    //queue calls to the database that happen before we are
    //actually ready to interact with the store
    this.ready = false;
    this.queue = [];

    //connect to IDB store
    this.store = new IDBStore(opts);
};

/****************************
    Loading Functions
*/

Storage.prototype.loadChunk = function(id, cb) {
    // body...
};

Storage.prototype.loadChunks = function(ids, cb) {
    if(typeof ids === 'function') {
        cb = ids;
        ids = null;
    }

    if(!ids) {
        //return all chunks
    }
    else {
        //load each ID
    }
};

Storage.prototype.loadItem = function(id, cb) {
    // body...
};

Storage.prototype.loadItems = function(ids, cb) {
    if(typeof ids === 'function') {
        cb = ids;
        ids = null;
    }

    if(!ids) {
        //return all items
    }
    else {
        //load each ID
    }
};

Storage.prototype.loadPlayer = function(id, cb) {
    // body...
};

Storage.prototype.loadGame = function(id, cb) {
    // body...
};

/****************************
    Saving Functions
*/

Storage.prototype.saveChunk = function(chunk, cb) {
    // body...
};

Storage.prototype.saveChunks = function(chunks, cb) {
    // body...
};

Storage.prototype.saveItem = function(item, cb) {
    // body...
};

Storage.prototype.saveItems = function(items, cb) {
    // body...
};

Storage.prototype.savePlayer = function(player, cb) {
    // body...
};

Storage.prototype.saveGame = function(game, cb) {
    // body...
};

/****************************
    Private and Helper Functions
*/

//ready callback for IDBStore
Store.prototype._onReady = function() {
    this.ready = true;

    //process the queue
    for(var i = 0, il = this.queue.length; i < il; ++i) {
        this[this.queue[i][0]].apply(this, this.queue[i][1]);
    }
    this.queue.length = 0;

    if(this.rdyCb) this.rdyCb();
};

//error callback for IDBStore
Storage.prototype._onError = function(err) {
    //should I be doing more than this?
    if(this.errCb) this.errCb(err);
    else throw err;
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