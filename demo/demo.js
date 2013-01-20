var createGame = require('voxel-engine')
var voxelStorage = require('../')
var store = voxelStorage({onReady: getChunks})

function getChunks() {
  store.loadChunks(function(err, chunks) {
    if (err) return console.error(err)
    if (chunks.length === 0) return createWorld()
    return loadWorld(chunks)
  })
}

function loadWorld(chunks) {
  var chunkMap = {}
  chunks.map(function(chunk) {
    chunkMap[chunk.value.position.join('|')] = chunk.value
  })
  createWorld({generateVoxelChunk: function chunkLoader(low, high, x, y, z) {
    var pos = [x, y, z].join('|')
    return chunkMap[pos] 
  }})
}

function createWorld(opts) {
  window.game = createGame(opts)
  
  var chunks = Object.keys(game.voxels.chunks).map(function(key){ return game.voxels.chunks[key]})
  store.storeChunks(chunks)

  game.appendTo('#container')

  game.on('mousedown', function (pos) {
    var cid = game.voxels.chunkAtPosition(pos)
    var vid = game.voxels.voxelAtPosition(pos)
    if (erase) {
      game.setBlock(pos, 0)
    } else {
      game.createBlock(pos, 1)
    }
  })

  var erase = true
  window.addEventListener('keydown', function (ev) {
    if (ev.keyCode === 'X'.charCodeAt(0)) {
      erase = !erase
    }
  })

  function ctrlToggle (ev) { erase = !ev.ctrlKey }
  window.addEventListener('keyup', ctrlToggle)
  window.addEventListener('keydown', ctrlToggle)

  var container = document.querySelector('#container')
  container.addEventListener('click', function() {
    game.requestPointerLock(container)
  })  
}
