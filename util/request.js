'use strict';

const request = require('request');

module.exports = function (option) {

	var options = {
		method: option.method,
		url: option.url,
		headers: { 
			'Content-Type': 'application/json',
		},
		timeout: 3000
	};

	if(option.data){
		if(option.type === 'json') options.json = option.data;
		options.form = option.data;
	}
	console.log('options.url  : ',options.url);

	let promise = new Promise((resolve, reject) => {
		request(options, (error, response) => {
			if(error) {
				console.log('error url',options.url);
				console.log('error',error);
				console.log('error.stack',error.stack);
				return resolve({error: error});
			}
			return resolve(JSON.parse(response.body));
		});
	});
	return promise;
};
