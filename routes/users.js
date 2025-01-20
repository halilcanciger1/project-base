var express = require('express');
var Response = require("../lib/Response");
const Users = require('../db/Users');
const CustomError = require('../lib/Error');
const Enum = require('../config/enum');
const bcrypt = require("bcrypt");
const validator = require('validator');
const Roles = require("../db/Roles");
const UserRoles = require("../db/UserRoles");
const auth = require("../lib/auth");
const config = require('../config/config1');
const jwt = require('jwt-simple');

var router = express.Router();

/* GET users listing. */
router.get('/', async (req, res) => {

  try {
    let users = await Users.find({});
    res.json(Response.successResponse(users));

  } catch (error) {
    let errorResponse = Response.errorResponse(error);
    res.status(errorResponse.code).json(Response.errorResponse(error));
  }

});

router.post('/add', async (req, res) => {
  let body = req.body;
  try {
    if (!body.email) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "Email field must be filled");
    if (!validator.isEmail(body.email)) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error!", "email field must be an email format");
    }
    if (!body.password) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "Password field must be filled");


    if (body.password.length < Enum.PASS_LENGTH) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "password length must be greater than " + Enum.PASS_LENGTH);
    }


    if (!body.roles || !Array.isArray(body.roles) || body.roles === 0) {
      if (!body.password) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "Roles field must be filled");
    }


    let roles = await Roles.find({ _id: { $in: body.roles } });

    if (roles.length === 0) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "Roles field must be an array")
    }

    let password = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8));


    let user = await Users.create({
      email: body.email,
      password,
      is_active: true,
      first_name: body.first_name,
      second_name: body.second_name,
      phone_number: body.phone_number
    });

    for (let i = 0; i < roles.length; i++) {
      await UserRoles.create({
        role_id: roles[i]._id,
        user_id: user._id
      })
    };

    res.status(Enum.HTTP_CODES.CREATED).json(Response.successResponse({ success: true }));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(Response.errorResponse(err));
  }
});


router.post("/update", async (req, res) => {

  try {
    let body = req.body;
    let updates = {};

    if (!body._id) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "Id field must be filled");

    if (!body.password && body.password.length >= Enum.PASS_LENGTH) {
      updates.password = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);
    }

    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (body.first_name) updates.first_name = body.first_name;
    if (body.second_name) updates.second_name = body.second_name;
    if (body.phone_number) updates.phone_number = body.phone_number;

    if (Array.isArray(body.roles) && body.roles.length > 0) {

      let userRoles = await UserRoles.find({ user_id: body._id });

      let removedRoles = userRoles.filter(x => !body.roles.includes(x.role_id));
      let newRoles = body.roles.filter(x => !userRoles.map(r => r.role_id).includes(x));

      if (removedRoles.length > 0) {
        await UserRoles.deleteMany({ _id: { $in: removedRoles.map(x => x._id.toString()) } });
      }

      if (newRoles.length > 0) {
        for (let i = 0; i < newRoles.length; i++) {
          let userRole = new UserRoles({
            role_id: newRoles[i],
            user_id: body._id
          });

          await userRole.save();
        }
      }

    }

        await Users.updateOne({ _id: body._id }, updates);

        res.json(Response.successResponse({ success: true }));

      } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(Response.errorResponse(err));
      }
    }
  );


router.post("/delete", async (req, res) => {
  try {
    let body = req.body;
    if (!body._id) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "Id field must be filled");

    await Users.deleteOne({ _id: body._id });

    await UserRoles.deleteMany({ user_id: body._id});

    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(Response.errorResponse(err));
  }
});


router.post('/register', async (req, res) => {
  let body = req.body;
  try {
    // E-posta ile mevcut kullanıcıyı kontrol et
    let user = await Users.findOne({ email: body.email });

    if (user) {
      // Kullanıcı zaten varsa, 409 Conflict hatası döndür
      return res.status(Enum.HTTP_CODES.CONFLICT).json(
        Response.errorResponse(new CustomError(Enum.HTTP_CODES.CONFLICT, "Conflict", "User already exists"))
      );
    }

    // Alanları kontrol et
    if (!body.email) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "Email field must be filled");
    if (!validator.isEmail(body.email)) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error!", "email field must be an email format");
    }
    if (!body.password) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "Password field must be filled");

    if (body.password.length < Enum.PASS_LENGTH) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "password length must be greater than " + Enum.PASS_LENGTH);
    }

    // Şifreyi hashle
    let password = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8));

    // Yeni kullanıcı oluştur
    let createdUser = await Users.create({
      email: body.email,
      password,
      is_active: true,
      first_name: body.first_name,
      second_name: body.second_name,
      phone_number: body.phone_number
    });

    // Role ve UserRole oluştur
    let role = await Roles.create({
      role_name: Enum.SUPER_ADMIN,
      is_active: true,
      created_by: createdUser._id
    });

    await UserRoles.create({
      role_id: role._id,
      user_id: createdUser._id
    });

    // Başarılı yanıt dön
    res.status(Enum.HTTP_CODES.CREATED).json(Response.successResponse({ success: true }));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});


router.post("/auth", async (req, res) => {
  try {

    let { email, password } = req.body;

    Users.validateFieldsBeforeAuth(email, password);

    let user = await Users.findOne({ email });

    if(!user) throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, "Validation Error", "Email or Password wrong");

    if(!user.validPassword(password)) throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, "Validation Error", "Email or Password wrong");

    let payload = {
      id: user._id,
      exp: parseInt(Date.now() / 1000) + config.JWT.EXPIRE_TIME
    }

    let token = jwt.encode(payload, config.JWT.SECRET);

    let userData = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name
    }

    res.json(Response.successResponse({ token, user: userData }));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
})

module.exports = router;
