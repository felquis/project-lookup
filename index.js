var esprima = require('esprima')
var gulp = require('gulp')
var through2 = require('through2')
var fs = require('fs')
var traverse = require('ast-traverse')

var project = {}

// path to your AngularJS files
gulp.src('./test.js')
	.pipe(through2.obj(function (file, encoding, callback) {

        var output = {
        	filename: file.history[0].replace(file.base, '')
        }

        var ast = esprima.parse(file.contents)

        // fs.writeFileSync('./data.json', JSON.stringify(ast, null, 4), 'utf-8');

		var filename = file.history[0].replace(file.base, '')

		traverse(ast, {
			pre: function(node, parent, prop, idx) {
				var module = findModuleDeclaration(node, parent, prop, idx) || {}
				var directives = findDirectives(node, parent, prop, idx) || {}
				var services = findServices(node, parent, prop, idx) || {}

				if (module.dependencies && module.name) {
					output.moduleName = module.name
					output.moduleDeps = module.dependencies
				}

				if (directives.name) {
					output.directives = output.directives || []
					output.directives.push(directives.name)
				}

				if (services.name) {
					output.services = output.services || []
					output.services.push(services.name)
				}
			}
		});

		if (!project[output.moduleName]) {
    		project[output.moduleName] = output
		} else if (project[output.moduleName]) {
			project[output.moduleName].duplicates = project[output.moduleName].duplicates || []
			project[output.moduleName].duplicates.push(output)
		}

		return callback(null, project)
	}))
	.pipe(through2.obj(function (file, encoding, callback) {

    	fs.writeFileSync('./project.json', JSON.stringify(project, null, 4), 'utf-8')

    	return callback(null, project)
	}))

function findModuleDeclaration(node, parent, prop, idx) {
	if (node.type !== 'MemberExpression') return
	if (node.property.name !== 'module') return
	if (node.object.name !== 'angular') return

	if (parent.arguments.length === 1) {
		return {
			name: parent.arguments[0].value
		}
	}

	if (parent.arguments.length === 2) {
		return {
			dependencies: parent.arguments[1].elements.map(function (val) {
				return val.value
			}),
			name: parent.arguments[0].value
		}
	}

}

function findDirectives(node, parent, prop, idx, filename) {
	if (node.type !== 'MemberExpression') return
	if (node.property.name !== 'directive') return

    // fs.writeFileSync('./outputs/any.json', JSON.stringify(parent, null, 4), 'utf-8');

	return {
		name: parent.arguments[0].value
	}
}

function findServices(node, parent, prop, idx, filename) {
	if (node.type !== 'MemberExpression') return
	if (node.property.name !== 'service') return

    // fs.writeFileSync('./outputs/any.json', JSON.stringify(parent.arguments, null, 4), 'utf-8');

	return {
		name: parent.arguments[0].value
	}
}

// factory
// service
// filter
// config
// provider
