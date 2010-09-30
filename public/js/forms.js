this.compileFormations = {};

(function($, undefined) {
    // compile formations

    function getPoints(diagram, y, x) {
        var points = [];
        for (var i in diagram) {
            for (var j=0; j < diagram[i].length; j++) {
                if ((diagram[i].charAt(j) == 'o') || (diagram[i].charAt(j) == 'x')) {
                    if ((x!=j) || (y!=i)) points.push([j-x, i-y]);
                }
            }
        }
        return points;
    }

    compileFormations = function(definitions) {
        var formations = {};
        for (name in definitions) {
            var diagram = definitions[name].split('\n');
            var formation = {};
            formation.name = name;
            formation.points = [];
            formation.difficulty = parseInt(diagram[0], 10);
            for (var i in diagram) {
                for (var j=0; j < diagram[i].length; j++) {
                    if (diagram[i].charAt(j) == 'o') {
                        formation.points.push(getPoints(diagram, i, j));
                    }
                }
            }

            if (formation.points.length == 0) {
                // malformed formation?
                console.log('Formation ' + formation.name + ' is malformed!');
                continue;
            }

            formation.size = formation.points[0].length+1;
            formations[name] = formation;
        }
        return formations;
    }

})();