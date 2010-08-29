var Formations = {
    'Easy': {
        points: [[1,0], [-1,0]],
        name: 'Easy',
        power: 'Broadcast',
        showOutline: false
    },
    'Apple Key': {
        points: [[-1,-1], [1,-1], [-1,1], [1,1]],
        name: 'Apple Key',
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
    'The Tank': {
        points: [[-1,-1], [-1,-2], [0,-3], [1,-2], [1,-1]],
        name: 'The Tank',
        power: 'Default',
        showOutline: false
    },
	'Block': {
		points: [[-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1]],
		name: 'Block',
		power: 'Default',
		showOutline: false,
    },
	'Fortress': {
		points: [[-2,-2], [-1,-2], [0,-2], [1,-2], [2,-2], [-2, -1], [2,-1], [-2,0], [2,0], [-2,1], [2,1], [-2,2], [-1,2], [0,2], [1,2], [2,2]],
		name: 'Fortress',
		power: 'Default',
		showOutline: false,
	},
	'Snake': {
		points: [[-1,1], [0,2], [-1,3], [-2,4], [-1,5]],
		name: 'Snake',
		power: 'Default',
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
		duration: 30,
		use: function(player) { console.log('Used broadcast power ' + player.name) }
	},
	'Skip': {
		duration: 1,
		use: function(player) {
			player.Formations[player.goals[++player.currentGoal]];
		}
	},
	'Default': {
		duration: 1,
		use: function(player) {
			// Default power does nothing
		}
	}
}

this.Formations = Formations;
