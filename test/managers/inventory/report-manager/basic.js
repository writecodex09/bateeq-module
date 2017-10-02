var helper = require("../../../helper");
var InventoryManager = require("../../../../src/managers/inventory/inventory-manager");
var ExpeditionManager = require("../../../../src/managers/inventory/efr-kb-exp-manager");
var SalesManager = require("../../../../src/managers/sales/sales-manager");
var ReportManager = require("../../../../src/managers/inventory/report-manager");
var InventoryDataUtil = require("../../../../test/data-util/inventory/report-manager-data-util");
var inventoryManager = null;
var salesManager = null;
var expeditionManager = null;
var reportManager = null;
var realizationOrder = null;

function getInventoryId(data) {
    return new Promise((resolve, reject) => {
        InventoryDataUtil.getInventoryData(data)
            .then(result => {
                inventoryManager.create(result)
                    .then(id => {
                        resolve(id);
                    });
            }).catch(e => {
                reject(e)
            });
    });
}

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            var data = require("../../../data");
            data(db).then((results) => {

                console.log("Initialize information for report...");
                inventoryManager = new InventoryManager(db, 'unit-test');
                salesManager = new SalesManager(db, 'unit-test');
                expeditionManager = new ExpeditionManager(db, 'unit-test');
                console.log("Finish initialize information for report...");

                console.log("Initialize Report Manager");
                reportManager = new ReportManager(db, 'unit-test');
                console.log("Finish Initialize Report Manager");

                getInventoryId(data).then(id => {
                    inventoryId = id;
                })
                .catch(e => {
                    done(e);
                });

                done();

                // InventoryDataUtil.getInventoryData(data)
                //     .then(result => {
                //         inventoryManager.create(result)
                //             .then(id => {
                //                 inventoryId = id;
                //                 done();
                //             });
                //     }).catch(e => {
                //         done(e)
                //     });
            });
        })
        .catch(e => {
            done(e);
        })
});

it('#01. test report per ro with realization order', function (done) {
    helper.getDb()
        .then(db => {
            reportManager.getReportItemsByRealizationOrder(realizationOrder)
                .then(result => {

                    if (result.length > 0) {
                        done("has result with no realization order");
                    } else {
                        done("no result");
                    }

                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#01. test report per ro with no realization order', function (done) {
    helper.getDb()
        .then(db => {
            realizationOrder = "";
            reportManager.getReportItemsByRealizationOrder(realizationOrder)
                .then(result => {

                    if (result.length > 0) {
                        done("has result with no realization order");
                    } else {
                        done("no result");
                    }

                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});