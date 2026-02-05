"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendUnathorizedResponse = exports.sendErr = exports.sendOk = exports.send = void 0;
const send = (res, msg, status) => {
    res.status(status).send(msg);
};
exports.send = send;
const sendOk = (res, msg) => {
    return (0, exports.send)(res, msg, 200);
};
exports.sendOk = sendOk;
const sendErr = (res, msg, status = 500) => {
    return (0, exports.send)(res, msg, status);
};
exports.sendErr = sendErr;
const sendUnathorizedResponse = (res, message = "Unauthorised") => {
    return (0, exports.send)(res, { message, error: "Unauthorised" }, 401);
};
exports.sendUnathorizedResponse = sendUnathorizedResponse;
