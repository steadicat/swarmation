var Formations = {
    'Easy': {
        points: [[1,0], [-1,0]],
        name: 'Easy',
        power: 'Broadcast',
        showOutline: true
    },
    'Apple Key': {
        points: [[-1,-1], [1,-1], [-1,1], [1,1]],
        name: 'Apple Key',
        power: 'Skip',
        showOutline: true
    },
    'Tetris': {
        points: [[0,1], [0,2], [0,3], [0,4]],
        name: 'Tetris',
        power: 'Default',
        showOutline: true
    },
    'Delta': {
        points: [[-2,2], [-1,1], [1,1], [2,2]],
        name: 'Delta',
        power: 'Default',
        showOutline: true
    },
    'The Tank': {
        points: [[-1,-1], [-1,-2], [0,-3], [1,-2], [1,-1]],
        name: 'The Tank',
        power: 'Default',
        showOutline: true
    },
	'Block': {
		points: [[-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1]],
		name: 'Block',
		power: 'Default',
		showOutline: true,
    },
	'Fortress': {
		points: [[-2,-2], [-1,-2], [0,-2], [1,-2], [2,-2], [-2, -1], [2,-1], [-2,0], [2,0], [-2,1], [2,1], [-2,2], [-1,2], [0,2], [1,2], [2,2]],
		name: 'Fortress',
		power: 'Default',
		showOutline: true,
	},
	'Snake': {
		points: [[-1,1], [0,2], [-1,3], [-2,4], [-1,5]],
		name: 'Snake',
		power: 'Default',
		showOutline: true
	},
	'Lobster': {
		points: [[0,-1], [0,-2], [-1,-3], [-1,-4], [1,3], [1,4]],
		name: 'Lobster',
		power: 'Default',
		showOutline: true
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