/**
 * Лимит на число счетчиков в одном запросе
 *
 * @type {Number}
 */
var MAX_BATCH_COUNTERS = 42;

/**
 * Интервал в миллисекундах, в течение которого счётчики склеиваются
 *
 * @type {Number}
 */
var COUNTERS_BATCH_TIMEOUT = 15;

function Counter() {
	this.guid = '';
	this.reqid = '';
	this.page = '';
	this.additional = {};

	this._inited = false;
	this._indexes = {};
	this._countersBatchData = [];
	this._counterTimerId = null;

	this.counterUrl = 'https://shri.yandex/hw/stat/send';
}

Counter.prototype.init = function(guid, reqid, page) {
	if (guid && reqid && page) {
		this.guid = guid;
		this.reqid = reqid;
		this.page = page;

		this._inited = true;
	}
};

Counter.prototype.setAdditionalParams = function(additionalParams) {
	this.additional = Object.assign({}, additionalParams);
};

/**
 * Отправка счётчика. Основной транспорт - sendBeacon, запасной - XMLHttpRequest. Быстро поступающие одиночные события
 * накапливаются и отправляются пачками по MAX_BATCH_COUNTERS штук.
 *
 * @param {String} name
 * @param {Number} value
 */
Counter.prototype.send = function(name, value) {
	if (!this._inited) {
		console.warn('counter is not inited');

		return;
	}

    clearTimeout(this._counterTimerId);

    if (!this._indexes[name]) {
    	this._indexes[name] = 0;
    }

    var counterData = {
		    counterId: this.guid,
		    requestId: this.reqid,
		    page: this.page,
		    name: name,
		    value: value,
		    index: this._indexes[name],
		    additional: this.additional
		},
		self = this;

    this._countersBatchData.push(counterData);

    this._indexes[name]++;

    if (this._countersBatchData.length < MAX_BATCH_COUNTERS) {
        this._counterTimerId = setTimeout(function() {
        	self.sendBatchRequest();
        }, COUNTERS_BATCH_TIMEOUT);
    } else {
        self.sendBatchRequest();
    }
};

Counter.prototype.sendBatchRequest = function() {
    var data = JSON.stringify(this._countersBatchData);

    this._countersBatchData = [];
    this._counterTimerId = null;

    var sendBeaconPostAvailable = navigator.sendBeacon,
        sendBeaconResult = sendBeaconPostAvailable && navigator.sendBeacon(this.counterUrl, new Blob([data], {type : 'application/json'}));

    if (!sendBeaconResult) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', this.counterUrl);
        xhr.send(data);
    }
}
