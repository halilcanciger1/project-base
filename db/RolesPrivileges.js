const mongoose = require("mongoose");

const schema = mongoose.Schema({
    role_id: {type: mongoose.SchemaTypes.ObjectId, required: true},
    permission: {type:String, required: true},
    created_by: {type: mongoose.SchemaTypes.ObjectId}
},{
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class RolesPrivileges extends mongoose.Model {

}

schema.loadClass(RolesPrivileges);
module.exports = mongoose.model("role_privileges", schema);