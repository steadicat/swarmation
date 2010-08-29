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
		name: 'Useless'
		duration: 1,
		use: function(player) {
			// Default power does nothing
		}
	}
}

this.Formations = Formations;
