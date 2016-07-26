'use strict';
/**
 * 每5分钟请求一次数据
 *
 */
const schedule = require('node-schedule');
const moment = require('moment');
const getAllDatas = require('../routes/thor').getAllDatas;
const sendEmail = require('../util/sendEmail').sendEmailWithShell;
const config = require('../config').config;
exports.every5mGetData = function () {
	getAllDatas();
	
	console.info('定时任务运行中....', moment(new Date()).format('YYYY-MM-DD hh'));

	var rule = new schedule.RecurrenceRule();
	var times = [];
	for(var i=1; i<60; i += config.intervalMinute){
		times.push(i);
	}
	rule.minute = times;
	
	schedule.scheduleJob(rule, function () {
		getAllDatas().then(result => {
			let connectorsRes = global.connectorsRes
			let errNodes = [];
			for(let item in connectorsRes){
				let nodes = connectorsRes[item];
				for(let node in nodes){
					if(connectorsRes[item][node].status !== 1){
						errNodes.push(node)
					}
				}
			}

			if(errNodes.length){
				sendEmail(errNodes);
			}
		}).catch(err =>{
			console.log('=================================err',err);
		});
	});
};
