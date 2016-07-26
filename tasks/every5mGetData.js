'use strict';
/**
 * 每5分钟请求一次数据
 *
 */
const schedule = require('node-schedule');
const moment = require('moment');
const getAllDatas = require('../routes/thor').getAllDatas;
exports.every5mGetData = function () {
	getAllDatas();
	
	var moment = require('moment');
	console.info('定时任务运行中....', moment(new Date()).format('YYYY-MM-DD hh'));

	var rule = new schedule.RecurrenceRule();
	var times = [];
	for(var i=1; i<60; i+=1){
		times.push(i);
	}
	rule.minute = times;
	
	schedule.scheduleJob(rule, function () {
		console.log('=================================content');
		getAllDatas();
	});
};
