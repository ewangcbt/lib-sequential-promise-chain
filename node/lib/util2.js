const Q = require('q');
const EventEmitter = require('events');
/**
 * SequentialPromiseExecutor
 *      a class that implements the feature that execute a series of promise calls in a sequential order 
 */

class SequentialPromiseExecutor {
    static getInstance(config) {
        return new SequentialPromiseExecutor()
            .registerInitResult(config.initResult)
            .registerRejectOn(config.rejectOn)
            .registerRejectMessage(config.rejectMessage)
            .registerResolveOn(config.resolveOn)
            .registerResolveMessage(config.resolveMessage)
            .registerFinishedMessage(config.finishedMessage);
    }

    constructor() {
        this.validateSequence = [];
    }
    /** 
     * register promise functions that is going to be executed in the future 
     * note: 
     *      the reason we only register functions that return a promise is 
     *      we want all code in promises to be executed sequentially, synchronized code or asynchronized code. 
     * @param:
     *      promiseFunction: is a function that returns a promise 
    */
    registerPromiseFunction(promiseFunction) {
        this.validateSequence.push(promiseFunction);
        return this;
    }
    registerInitResult(initResult) {
        this.initResult = initResult;
        return this;
    }
    /** 
     * @param:
     *      step: is a function that returns a promise 
    */
    exec() {
        const self = this;
        let idx = 0;
        return Q.promise(function (resolve, reject) {
            const seqController = new EventEmitter();
            seqController.on('taskDone', function (previousResult) {
                if (idx >= self.validateSequence.length) {
                    return seqController.emit('allTaskDone');
                } else {
                    idx++;
                    seqController.emit('newTask', previousResult);
                }
            });
            seqController.on('newTask', function (previousResult) {
                return self.validateSequence[idx](previousResult)
                .then(function (result) {
                    if (self.rejectOn && self.rejectOn(result)) {
                        return seqController.emit('taskFailed', result);
                    }
                    if (self.resolveOn && self.resolveOn(result)) {
                        return seqController.emit('allTaskDone', result);
                    }
                    seqController.emit('taskDone', result);
                });
            });
            seqController.on('allTaskDone', function (result) { 
                if (self.finishedMessage) {
                    return resolve(self.finishedMessage());
                }
                return resolve(result);
            });
            seqController.on('resolved', function (result) { 
                if (self.resolveMessage) {
                    return resolve(self.resolveMessage(result));
                }
                return resolve(result);
            });
            seqController.on('taskFailed', function (result) { 
                if (self.rejectMessage) {
                    return reject(self.rejectMessage(result));
                }
                return reject(result);
            });
        });
    }
    registerRejectOn(rejectOnFunction) {
        this.rejectOn = rejectOnFunction;
        return this;
    }
    registerRejectMessage(rejectMsgFunction) {
        this.rejectMessage = rejectMsgFunction;
        return this;
    }
    registerResolveOn(resolveOnFunction) {
        this.resolveOn = resolveOnFunction;
        return this;
    }
    registerResolveMessage(resolveMsgFunction) {
        this.resolveMessage = resolveMsgFunction;
        return this;
    }
    registerFinishedMessage(finishedMessage) {
        this.finishedMessage = finishedMessage;
        return this;
    }
}

module.exports = { SequentialPromiseExecutor }; 
