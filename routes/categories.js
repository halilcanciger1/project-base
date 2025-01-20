var express = require("express");
var router = express.Router();
const Categories = require("../db/Categories");
const Response = require("../lib/Response");
const Enum = require("../config/enum");
const CustomError = require("../lib/Error");
const AuditLogs = require("../lib/Auditlogs");
const logger = require("../lib/logger/LoggerClass");

router.get('/', async (req, res) => {
    try {
        let categories = await Categories.find();
        res.json(Response.successResponse(categories));

    }
    catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(Response.errorResponse(err));
    }
});

router.post('/add', async (req, res) => {
    let body = req.body;
    try {
        if (!body.name) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error!", "name field must be filled")

        let category = new Categories({
            name: body.name,
            is_active: true,
            created_by: req.user?.id
        });

        await category.save();

        AuditLogs.info(req.user?.email, "Categories", "Add", category);
        logger.info(req.user?.email, "Categories", "Add", category);

        res.json(Response.successResponse({ success: true }));

    }


    catch (err) {
        logger.error(req.user?.email, "Categories", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }

});
router.post('/update', async (req, res) => {
    let body = req.body;
    try {
        if (!body.name) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error!", "name field must be filled")

        let updates = {};

        if (body.name) updates.name = body.name;
        if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

        await Categories.updateOne({ _id: body._id }, updates);

        AuditLogs.info(req.user?.email, "Categories", "Update", { _id: body._id, ...updates });

        res.json(Response.successResponse({ success: true }));

    }

    catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }

});


router.post('/delete', async (req, res) => {
    let body = req.body;
    try {
        if (!body.name) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error!", "name field must be filled")

        await Categories.deleteOne
            // eslint-disable-next-line no-unexpected-multiline
            ({ _id: body._id });

        AuditLogs.info(req.user?.email, "Categories", "Delete", { _id: body._id});

        res.json(Response.successResponse({ success: true }));

    }

    catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }


});

module.exports = router;