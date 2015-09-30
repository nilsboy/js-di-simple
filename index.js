var mout = require('mout') // TODO replace
var log = require('bunyan')
  .createLogger({
    name: 'di'
  })

function parseFunctionDependencies(target) {
  var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m
  var FN_ARG_SPLIT = /,/
  var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/
  var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
  var text = target.toString()
  var args = text.match(FN_ARGS)[1].split(',')
  return args
}

function resolveFunctionArguments(obj, args) {
  var self = obj

  var resolvedArgs = args.map(function (value) {
    return self[value]()
  })

  log.debug('Resolved args:\n', args, '\nto:\n', resolvedArgs)

  return resolvedArgs
}

function process(self, target) {
  var args = parseFunctionDependencies(target)
  return target.apply(target, resolveFunctionArguments(self, args))
}

module.exports = {
  // di.register('db', require('./db'), { dependencies: { 'db-pool': pool } })
  // di.register('db', require('./db'), { dependencies: [ 'db-pool' ] })
  register: function (name, dependency, options) {
    var self = this
    log.debug('Registering: ' + name + ' of type: ' + typeof dependency)

    if (typeof dependency === 'string') {
      this[name] = dependency
      return
    }

    if (typeof dependency === 'object') {
      this[name] = function objectGetter() {
        if (typeof dependency === 'object') {
          if (options && options.dependencies) {
            if (Array.isArray(options.dependencies)) {
              options.dependencies.forEach(function (dependency_name) {
                if (self[dependency_name] === undefined) {
                  throw new Error('Not defined: ' + dependency_name)
                }
                dependency[dependency_name] = self[dependency_name]()
              })
            } else {
              mout.object.forIn(options.dependencies, function (dependency_name,
                dependency_destination) {
                dependency[dependency_name] = self[dependency_destination]()
              })
            }
          }
          return dependency
        }
      }
      return
    }

    if (typeof dependency === 'function') {
      this[name] = function functionProcessor() {
        // return process(this, dependency)
        return dependency
      }

      return
    }

    throw new Error('Unknown dependency type')
  }
}
