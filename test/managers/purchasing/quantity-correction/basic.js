var options = {
    manager: require("../../../../src/managers/purchasing/unit-payment-quantity-correction-note-manager"),
    model: require("bateeq-models").purchasing.UnitPaymentCorrectionNote,
    util: require("../../../data-util/purchasing/unit-payment-quantity-correction-note-data-util"),
    validator: require("bateeq-models").validator.purchasing.unitPaymentCorrectionNote,
    createDuplicate: false,
    keys: []
};

var basicTest = require("../../../basic-test-factory");
basicTest(options);