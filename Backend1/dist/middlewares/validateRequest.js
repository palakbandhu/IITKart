"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                next(error); // Passes to global error handler
            }
            else {
                next(error);
            }
        }
    };
};
exports.validateRequest = validateRequest;
const validateQuery = (schema) => {
    return async (req, res, next) => {
        try {
            req.query = await schema.parseAsync(req.query);
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;
//# sourceMappingURL=validateRequest.js.map