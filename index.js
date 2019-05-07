// let NodeXlsx = require('node-xlsx');
const Path = require("path");
const Fs = require('fs');
const IconvLite = require('iconv-lite');
const Moment = require("moment");

var allData = {
    // 按照类型
    type: {
        "插件1": []
    },
    // 按照时间
    time: {
        day: [
            {time: "", name: "", total: 0, cur: 0, event: "[发布插件][调整价格]"},
        ],
        month: [
            {time: "", total: 0, cur: 0, event: ""}
        ]
    }


}

let file = "cocos_store_sales.csv";
let excelFile = Path.join(__dirname, file);
if (Fs.existsSync(excelFile)) {
    let excelData = Fs.readFileSync(excelFile);
    excelData = IconvLite.decode(excelData, "GB2312");
    let array = excelData.split('\n');
    let resultArray = [];
    let allTypes = {};
    for (let i = 1; i < array.length; i++) {
        let item = array[i].split(',');

        if (item.length < 6) {
            // console.log("跳");
            continue;
        }
        let itemData = {
            // order: sub(item[0]),
            name: sub(item[1]),
            // version: sub(item[2]),
            time: sub(item[3]),
            price: sub(item[4]),
            income: sub(item[5]),
        };

        if (!allTypes[itemData.name]) {
            allTypes[itemData.name] = [];
        }
        allTypes[itemData.name].push(itemData);

        resultArray.push(itemData);
    }
    // 按照时间先后进行了一次排序
    resultArray.sort(function (a, b) {
        let valueA = Moment(a.time).valueOf();
        let valueB = Moment(b.time).valueOf();
        return valueA - valueB;

    });
    // 分析插件数量
    let events = analyzeDay(resultArray);
    analyzeMonth(resultArray, events);
    analyzeType(resultArray);
    saveJS();
    // for (let key in allTypes) {
    //     let item = allTypes[key];
    // }


} else {
    console.log("请到后台下载销售记录csv文件");
}

function sub(str) {
    if (!str || !str.length) {
        debugger
    }
    if (str.length >= 2) {
        return str.substr(1, str.length - 2);

    } else {
        return str;
    }
}

// 分析每天
function analyzeDay(data) {
    let all = JSON.parse(JSON.stringify(data));
    // [发布插件][调整价格]
    let events = [];
    let temp = {};
    let day = {};
    let totalIncome = 0;
    for (let i = 0; i < all.length; i++) {
        let item = all[i];
        item.event = "";
        totalIncome += parseFloat(item.income.toString());
        item.totalIncome = totalIncome.toFixed(2);
        if (!temp[item.name]) {
            // 第一次出现,发布插件
            item.event += "[发布插件]";
            events.push(item);
            temp[item.name] = item;
        } else {
            // 已经发布过这个插件
            if (temp[item.name].price !== item.price) {
                // 价格进行了调整
                item.event += `[价格调整]${item.price}`;
                events.push(item);
                temp[item.name] = item;
            }
        }


        // let time = Moment(item.time);
        // let key = `${time.year()}-${(time.month() + 1)}-${time.daysInMonth()}`;
        let key = item.time.split(' ')[0];
        if (!day[key]) {
            day[key] = {
                totalIncome: 0,
                buy: []
            }
        }
        day[key].buy.push(item);
    }
    for (let key in day) {
        let item = day[key];
        for (let i = 0; i < item.buy.length; i++) {
            item.totalIncome += parseFloat(item.buy[i].income.toString());
        }
        item.totalIncome = item.totalIncome.toFixed(2);
    }
    allData.time.day = day;
    return events;
}

// 分析每月
function analyzeMonth(data, events) {
    let all = JSON.parse(JSON.stringify(data));
    let months = {};
    for (let i = 0; i < all.length; i++) {
        let item = all[i];
        let time = Moment(item.time);
        let key = `${time.year()}-${(time.month() + 1)}`;
        if (months[key]) {
            months[key].day.push(item);
        } else {
            months[key] = {
                event: "",
                totalIncome: 0,
                day: [item]
            };
        }
    }

    // 计算当月收入
    for (let key in months) {
        let array = months[key];
        let total = 0;
        for (let i = 0; i < array.day.length; i++) {
            total += parseFloat(array.day[i].income.toString());
        }
        array.totalIncome = total.toFixed(2);
    }
    // 当月发生的事件

    for (let i = 0; i < events.length; i++) {
        let item = events[i];
        let time = Moment(item.time);
        let key = `${time.year()}-${(time.month() + 1)}`;
        months[key].event += item.event;
    }

    allData.time.month = months;
}

function analyzeType(data) {
    let types = {};
    let all = JSON.parse(JSON.stringify(data));
    for (let i = 0; i < all.length; i++) {
        let item = all[i];
        if (!types[item.name]) {
            types[item.name] = {
                totalIncome: 0,
                day: [],
            }
        }
        types[item.name].day.push(item);
    }

    for (let key in types) {
        let item = types[key];
        item.totalIncome = 0;
        for (let i = 0; i < item.day.length; i++) {
            let item1 = item.day[i];
            item.totalIncome += parseFloat(item1.income);
        }
        item.totalIncome = item.totalIncome.toFixed(2);
    }

    allData.type = types;
}

function saveJS() {
    let data = JSON.stringify(allData);
    Fs.writeFileSync(Path.join(__dirname, 'data.js'), `window.analyzeData=${data}`);

}
