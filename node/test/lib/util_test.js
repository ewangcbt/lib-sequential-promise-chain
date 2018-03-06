process.env.NODE_ENV = 'test';
const chai = require('chai');
const expect = chai.expect;
const Q = require('q');

const { SequentialPromiseExecutor } = require('../../lib/util');

let globalExecutionSequence = [];

const getTimeoutPromiseFunctionWithTag = function (timeout, flag) {
    return function (prevResult) {
        return Q.promise(function (resolve, reject) {
            setTimeout(() => {
                prevResult.push(flag);
                // sync global variable for test reason
                globalExecutionSequence = prevResult;
                return resolve(prevResult);
            }, timeout);
        });
    };
};

const getTestInstanceWithConfig = function (config) {
    return SequentialPromiseExecutor
        .getInstance(config)
        .registerPromiseFunction(getTimeoutPromiseFunctionWithTag(1, 'A'))
        .registerPromiseFunction(getTimeoutPromiseFunctionWithTag(1, 'B'))
        .registerPromiseFunction(getTimeoutPromiseFunctionWithTag(1, 'C'))
        .registerPromiseFunction(getTimeoutPromiseFunctionWithTag(1, 'D'));
};

describe('Permission Library Test', function () {
    beforeEach(done => {
        globalExecutionSequence = [];
        return done();
    });
    describe('Vulnerability test', function () {
        it('Should execute sequence', function (done) {
            getTestInstanceWithConfig({
                initResult: []
            })
                .exec()
                .then(function (res) {
                    expect(res).to.deep.equal(['A', 'B', 'C', 'D']);
                    done();
                });
        });
        it('Should execute sequence and resolve with resolveOn setting satisfied', function (done) {
            getTestInstanceWithConfig({
                initResult: [],
                resolveOn: currentResult => currentResult.length === 2
            })
                .exec()
                .then(function (res) {
                    expect(res).to.deep.equal(['A', 'B']);
                    done();
                });
        });
        it('Should execute sequence and resolve with resolveOn setting satisfied and resolve resolveMessage', function (done) {
            getTestInstanceWithConfig({
                initResult: [],
                resolveOn: currentResult => currentResult.length === 2,
                resolveMessage: () => 'TEST_RESOLVE_MESSAGE'
            })
                .exec()
                .then(function (res) {
                    expect(globalExecutionSequence).to.deep.equal(['A', 'B']);
                    expect(res).to.equal('TEST_RESOLVE_MESSAGE');
                    done();
                });
        });
        it('Should execute sequence and reject with rejectOn setting satisfied', function (done) {
            getTestInstanceWithConfig({
                initResult: [],
                rejectOn: currentResult => currentResult.length === 2
            })
                .exec()
                .then(function (res) {
                    done('TEST SHOULD RESOLVE');
                })
                .catch(function (errRes) {
                    expect(errRes).to.deep.equal(['A', 'B']);
                    done();
                });
        });
        it('Should execute sequence and reject with rejectOn setting satisfied', function (done) {
            getTestInstanceWithConfig({
                initResult: [],
                rejectOn: currentResult => currentResult.length === 2,
                rejectMessage: () => 'TEST_REJECT_MESSAGE'
            })
                .exec()
                .then(function (res) {
                    done('TEST SHOULD NOT RESOLVE');
                })
                .catch(function (errRes) {
                    expect(globalExecutionSequence).to.deep.equal(['A', 'B']);
                    expect(errRes).to.equal('TEST_REJECT_MESSAGE');
                    done();
                });
        });
        it('Should execute sequence and return with finished message', function (done) {
            getTestInstanceWithConfig({
                initResult: [],
                finishedMessage: () => 'TEST_FINISHED_MESSAGE'
            })
                .exec()
                .then(function (res) {
                    expect(res).to.equal('TEST_FINISHED_MESSAGE');
                    done();
                });
        });
    });
});
