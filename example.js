var chunks = Object.keys(game.voxels.chunks).map(function(key){ return game.voxels.chunks[key]})
storage.storeChunk(chunks[0], function(err, id){ console.log(err, id) })
storage.loadChunk("chunk_-2|-2|-2", function(err, chunk){ console.log(err, chunk) })