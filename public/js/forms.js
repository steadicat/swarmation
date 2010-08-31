this.compileFormations = {};

(function($, undefined) {
    // compile formations

    function getPoints(diagram, y, x) {
        var points = [];
        for (var i in diagram) {
            for (var j in diagram[i]) {
                if ((diagram[i][j] == 'o') || (diagram[i][j] == 'x')) {
                    if ((x!=j) || (y!=i)) points.push([x-j, i-y]);
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
            for (var i in diagram) {
                for (var j in diagram[i]) {
                    if (diagram[i][j] == 'o') {
                        formation.points.push(getPoints(diagram, i, j));
                    }
                }
            }
            formations[name] = formation;
        }
        return formations;
    }

})();