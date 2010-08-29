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
        power: '',
        showOutline: true
    },
    'Delta': {
        points: [[-2,2], [-1,1], [1,1], [2,2]],
        name: 'Delta',
        power: '',
        showOutline: true
    },
    'The Tank': {
        points: [[-1,-1], [-1,-2], [0,-3], [1,-2], [1,-1]],
        name: 'The Tank',
        power: '',
        showOutline: true
    },
	'Block': {
		points: [[-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1]],
		name: 'Block',
		power: '',
		showOutline: true,
    },
	'Fortress': {
		points: [[-2,-2], [-1,-2], [0,-2], [1,-2], [2,-2], [-2, -1], [2,-1], [-2,0], [2,0], [-2,1], [2,1], [-2,2], [-1,2], [0,2], [1,2], [2,2]],
		name: 'Fortress',
		power: '',
		showOutline: true,
	},
	'Snake': {
		points: [[-1,1], [0,2], [-1,3], [-2,4], [-1,5]],
		name: 'Snake',
		power: '',
		showOutline: true
	},
	'Lobster': {
		points: [[0,-1], [0,-2], [-1,-3], [-1,-4], [1,3], [1,4]],
		name: 'Lobster',
		power: '',
		showOutline: true
	}
};

var Powers = {
	'Broadcast': {
		duration: 30,
		use: function(player) { console.log('Used broadcast power') }
	},
	'Skip': {
		duration: 1,
		use: function(player) {
			player.Formations[player.goals[++player.currentGoal]];
		}
	}
}