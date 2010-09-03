var Formations = {
    'Easy': {
        points: [[1,0], [-1,0]],
        name: 'Easy',
        power: 'Default',
        showOutline: false
    },
    'Clover': {
        points: [[-1,-1], [1,-1], [-1,1], [1,1]],
        name: 'Clover',
        power: 'Skip',
        showOutline: false
    },
    'Tetris': {
        points: [[0,1], [0,2], [0,3], [0,4]],
        name: 'Tetris',
        power: 'Default',
        showOutline: false
    },
    'Delta': {
        points: [[-2,2], [-1,1], [1,1], [2,2]],
        name: 'Delta',
        power: 'Default',
        showOutline: false
    },
    'Tank': {
        points: [[-1,-1], [-1,-2], [0,-3], [1,-2], [1,-1]],
        name: 'Tank',
        power: 'Default',
        showOutline: false
    },
	'Block': {
		points: [[-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1]],
		name: 'Block',
		power: 'Default',
		showOutline: false
    },
	'Fortress': {
		points: [[-2,-2], [-1,-2], [0,-2], [1,-2], [2,-2], [-2, -1], [2,-1], [-2,0], [2,0], [-2,1], [2,1], [-2,2], [-1,2], [0,2], [1,2], [2,2]],
		name: 'Fortress',
		power: 'Default',
		showOutline: false
	},
	'Snake': {
		points: [[-1,1], [0,2], [-1,3], [-2,4]],
		name: 'Snake',
		power: 'Skip',
		showOutline: false
	},
	'Lobster': {
		points: [[0,-1], [0,-2], [-1,-3], [-1,-4], [1,3], [1,4]],
		name: 'Lobster',
		power: 'Default',
		showOutline: false
	},
	'Hat': {
		points: [[1,0], [2,0], [3,0], [4,0], [1,-1], [3,-1], [1,-2], [2,-2], [3,-2]],
		name: 'Hat',
		power: 'Default',
		showOutline: false 
	},
	'Home': {
		points: [[-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1], [2,0], [-2,0], [0,2], [0,-2], [-1,2], [1,2]],
		name: 'Home',
		power: 'Default',
		showOutline: false
	},
	'Table': {
		points: [[1,0], [2,0], [3,0], [4,0], [1,1], [3,1]],
		name: 'Table',
		power: 'Default',
		showOutline: false
	},
	'Patchwork': {
		points: [[1,-1],[3,-1],[2,0],[4,0],[1,1],[3,1],[0,2],[2,2],[4,2],[1,3],[3,3]],
		name: 'Patchwork',
		power: 'Default',
		showOutline: false
	},
	'Volcano': {
		points: [[1,0],[2,0],[3,0],[4,0],[1,-1],[2,-1],[3,-1],[2,-2]],
		name: 'Patchwork',
		power: 'Default',
		showOutline: false
	},
	'Spiral': {
		points: [[0,-1], [-1,-1], [-2,0], [-2, 1], [-1,-2], [0,-2], [1,-2], [2,1], [2,0]],
		name: 'Patchwork',
		power: 'Default',
		showOutline: false
	}
};

var Powers = {
	'Broadcast': {
		name: 'Broadcast',
		duration: 30,
		use: function(player) {  }
	},
	'Skip': {
		name: 'Skip',
		duration: 1,
		use: function(player) { }
	},
	'Default': {
		name: 'Useless',
		duration: 1,
		use: function(player) {
			// Default power does nothing
		}
	}
}

this.Formations = Formations;
