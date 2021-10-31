const session = '5CA24E1F-55C0-48D0-805F-3DF14CEA1530'
//Для тестирования (более подробной статистики) можно использовать Session ID: D8F28E50-3339-11EC-9EDF-9F93090795B1

fetch(`https://shri.yandex/hw/stat/data?counterId=${session}`)
	.then(res => res.json())
	.then(result => {
		let data = prepareData(result);
		showSession();
		const tableMetrics = calcMetricsByDate(data, 'send test', '2021-10-28');
		showMetricByPeriod(data, tableMetrics,'send test', '2021-10-28', '2021-10-29');

		compareMetric(
			calcMetricByDate(data, 'send test', '2021-10-28'),
			calcMetricByDate(data, 'send test', '2021-10-29'))
	});

// показать сессию пользователя
function showSession() {
	console.log(`Сессия ID: ${session}`)
}

function clearNaN(table) {
	for (let row in table) {
		for (let column in table[row]) {
			if (isNaN(table[row][column])) {
				table[row][column] = 0;
			}
		}
	}
	return table;
}

//Показывает значение метрик в указанные периоды.
function showMetricByPeriod(data, tableMetrics, page, startDate, endDate) {
	console.log(`Метрика в период с ${startDate} по ${endDate}:`)
	let table = {}
	for (const key in tableMetrics) {
		let sampleData = data
			.filter(item => item.page === page && item.name === key && (new Date(startDate).getTime() <= new Date(item.date).getTime() && new Date(item.date).getTime() <= new Date(endDate).getTime()))
			.map(item => item.value);

		let result = {};
		result.hits = sampleData.length;
		result.p25 = quantile(sampleData, 0.25);
		result.p50 = quantile(sampleData, 0.5);
		result.p75 = quantile(sampleData, 0.75);
		result.p95 = quantile(sampleData, 0.95);
		table[key] = result;
	}
	table = clearNaN(table);
	console.table(table);
}


function quantile(arr, q) {
    const sorted = arr.sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (sorted[base + 1] !== undefined) {
        return Math.floor(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
    } else {
        return Math.floor(sorted[base]);
    }
}

function prepareData(result) {
	return result.data.map(item => {
		item.date = item.timestamp.split('T')[0];
		return item;
	});
}

// сравнить метрику в разных срезах (между значениями)
function compareMetric(tableOne, tableTwo) {
	console.log("Разница в срезах: ");

	for (let column in tableOne) {
		if (!(column in tableTwo)) {
			delete tableOne[column];
		}
	}

	for (let column in tableTwo) {
		if (!(column in tableOne)) {
			delete tableTwo[column];
		}
	}


	for (let row in tableOne) {
		for (let column in tableOne[row]) {
			tableOne[row][column] = Math.abs(tableOne[row][column] - tableTwo[row][column])
		}
	}

	console.table(clearNaN(tableOne));
}

// добавить метрику за выбранный день
function addMetricByDate(data, page, name, date) {
	let sampleData = data
					.filter(item => item.page == page && item.name == name && item.date == date)
					.map(item => item.value);
	let result = {};

	result.hits = sampleData.length;
	result.p25 = quantile(sampleData, 0.25);
	result.p50 = quantile(sampleData, 0.5);
	result.p75 = quantile(sampleData, 0.75);
	result.p95 = quantile(sampleData, 0.95);

	return result;
}

// рассчитывает все метрики за день
function calcMetricsByDate(data, page, date) {
	console.log(`Данные о метриках в ${date}:`);
	const table = calcMetricByDate(data,page,date);
	console.table(table);
	return table;
}

function calcMetricByDate(data, page, date) {
	let table = {};
	table.connect = addMetricByDate(data, page, 'connect', date);
	table.ttfb = addMetricByDate(data, page, 'ttfb', date);
	table.load = addMetricByDate(data, page, 'load', date);
	table.square = addMetricByDate(data, page, 'square', date);
	table.load = addMetricByDate(data, page, 'load', date);
	table.generate = addMetricByDate(data, page, 'generate', date);
	table.draw = addMetricByDate(data, page, 'draw', date);
	return clearNaN(table);
}
