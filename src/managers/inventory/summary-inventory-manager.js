"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var generateCode = require("../../utils/code-generator");

var ProductManager = require('../master/product-manager');
var StorageManager = require('../master/storage-manager');
var UomManager = require('../master/uom-manager');

var Models = require("bateeq-models");
var Map = Models.map;
var SummaryInventoryModel = Models.inventory.SummaryInventory;
var MovementInventoryModel = Models.inventory.MovementInventory;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class SummaryInventoryManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.inventory.SummaryInventory);

        this.storageManager = new StorageManager(db, user);
        this.productManager = new ProductManager(db, user);
        this.uomManager = new UomManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
                _deleted: false
            },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var storageNameFilter = {
                "storageName": {
                    "$regex": regex
                }
            };
            var productNameFilter = {
                "productName": {
                    "$regex": regex
                }
            };
            var productCodeFilter = {
                "productCode": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [productNameFilter, productCodeFilter, storageNameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(Summaryinventory) {
        var errors = {};
        var valid = Summaryinventory;

        var getDbSummaryInventory = this.collection.singleOrDefault({
            productId: new ObjectId(valid.productId),
            storageId: new ObjectId(valid.storageId),
            uomId: new ObjectId(valid.uomId)
        });

        var getDuplicateSummaryInventory = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            productId: new ObjectId(valid.productId),
            storageId: new ObjectId(valid.storageId),
            uomId: new ObjectId(valid.uomId)
        });

        var getProduct = valid.productId && ObjectId.isValid(valid.productId) ? this.productManager.getSingleByIdOrDefault(valid.productId) : Promise.resolve(null);
        var getStorage = valid.storageId && ObjectId.isValid(valid.storageId) ? this.storageManager.getSingleByIdOrDefault(valid.storageId) : Promise.resolve(null);
        var getUom = valid.uomId && ObjectId.isValid(valid.uomId) ? this.uomManager.getSingleByIdOrDefault(valid.uomId) : Promise.resolve(null);

        return Promise.all([getDbSummaryInventory,getDuplicateSummaryInventory, getProduct, getStorage, getUom])
            .then(results => {
                var _dbSummaryInventory = results[0]; 
                var _dbDuplicateSummaryInventory = results[1];
                var _product = results[2];
                var _storage = results[3];
                var _uom = results[4];

                if (_dbSummaryInventory)
                {
                    // prevent key changes.
                    valid.code = _dbSummaryInventory.code;
                }

                if (_dbDuplicateSummaryInventory)
                    errors["productId"] = errors["storageId"] = errors["uomId"] = i18n.__("SummaryInventory.key.isExist:%s is exist", i18n.__("SummaryInventory.key._:Key"));

                if (!valid.productId || valid.productId === '')
                    errors["productId"] = i18n.__("SummaryInventory.productId.isRequired:%s is required", i18n.__("SummaryInventory.productId._:Product")); //"Grade harus diisi";   
                else if (!_product)
                    errors["productId"] = i18n.__("SummaryInventory.productId: %s not found", i18n.__("SummaryInventory.productId._:Product"));

                if (!valid.storageId || valid.storageId === '')
                    errors["storageId"] = i18n.__("SummaryInventory.storageId.isRequired:%s is required", i18n.__("SummaryInventory.storageId._:Storage")); //"Grade harus diisi";   
                else if (!_product)
                    errors["storageId"] = i18n.__("SummaryInventory.storageId:%s not found", i18n.__("SummaryInventory.storageId._:Storage"));

                // if (!valid.uomId || valid.uomId === '')
                //     errors["uomId"] = i18n.__("InventorySummary.uomId.isRequired:%s is required", i18n.__("InventorySummary.uomId._:Uom")); //"Grade harus diisi";   
                // else if (!_uom)
                //     errors["uomId"] = i18n.__("InventorySummary.uomId:%s not found", i18n.__("InventorySummary.uomId._:Uom"));


                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }


                valid.productId = _product._id;
                valid.productName = _product.name;
                valid.productCode = _product.code;

                valid.storageId = _storage._id;
                valid.storageName = _storage.name;
                valid.storageCode = _storage.code;

                valid.uomId = _uom._id;
                valid.uom = _uom.unit;

                if (!valid.stamp) {
                    valid = new SummaryInventoryModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);


            })
    }

    getSert(productId, storageId, uomId) {
        var query = {
            productId: new ObjectId(productId),
            storageId: new ObjectId(storageId),
            uomId: new ObjectId(uomId)
        }

        return this.getSingleByQueryOrDefault(query)
            .then((doc) => {
                if (doc)
                    return doc;
                else
                    return this.create(query)
                        .then(id => this.getSingleById(id));
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.inventory.SummaryInventory}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var keyIndex = {
            name: `ix_${Map.inventory.SummaryInventory}__productId_storageId_uomId`,
            key: {
                productId: 1,
                storageId: 1,
                uomId: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, keyIndex]);
    }

    getSummaryReport(info) {
        var _defaultFilter = {
            _deleted: false
        }, 
            query = {},
            order = info.order || {};

        var filterSummary = {};

        if(info.storageId)
            filterSummary.storageId = new ObjectId(info.storageId);

        if(info.productId)
            filterSummary.productId = new ObjectId(info.productId);


        query = { '$and': [_defaultFilter, filterSummary] };

        var data = this._createIndexes()
            .then((createIndexResults) => {
                return !info.xls ?
                    this.collection
                        .where(query)
                        .order(order)
                        .execute() :
                    this.collection
                        .where(query)
                        .page(info.page, info.size)
                        .order(order)
                        .execute();
            });
                    
        return Promise.resolve(data);
    }

    getXls(result) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;

        for (var summary of result.data) {
            index++;

            var item = {};
            item["No"] = index;
            item["Storage"] = summary.storageName ? summary.storageName : '';
            item["Nama Barang"] = summary.productName ? summary.productName : '';
            item["Kuantiti"] = summary.quantity ? summary.quantity : 0;
            item["UOM"] = summary.uom ? summary.uom : '';
            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["Storage"] = "string";
        xls.options["Nama Barang"] = "string";
        xls.options["Kuantiti"] = "number";
        xls.options["UOM"] = "string";
        
        xls.name = `Summaries Inventory.xlsx`;

        return Promise.resolve(xls);
    }
}