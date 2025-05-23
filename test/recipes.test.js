const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../index');
const User = require('../database/models/users');
const mongoose = require('../database/dbConection');
const userService = require('../database/services/users');
const recipeService = require('../database/services/recipes');

let id;
let token;

describe('test the recipes API', () => {
  beforeAll(async () => {
    // create a test user
    const password = bcrypt.hashSync('okay', 10);

    await User.create({
      username: 'admin',
      password,
    });
  });

  afterAll(async () => {
    await User.deleteMany();
    mongoose.disconnect();
  });

  // test login
  describe('POST/login', () => {
    it('authenticate user and sign them in', async () => {
      // DATA YOU WANT TO SAVE
      const user = {
        username: 'admin',
        password: 'okay',
      };

      const res = await request(app).post('/login').send(user);

      token = res.body.accessToken;
      console.log(res.body);

      expect(res.statusCode).toEqual(200);

      expect(res.body).toEqual(expect.objectContaining({
        accessToken: res.body.accessToken,
        success: true,
        data: expect.objectContaining({
          id: res.body.data.id,
          username: res.body.data.username,
        }),
      }));
    });

    it('do not sign them in, password field cannot be empty', async () => {
      // DATA YOU WANT TO SAVE IN DB
      const user = {
        username: 'admin',
      };

      const res = await request(app)
        .post('/login')
        .send(user);
      expect(res.statusCode).toEqual(400);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'username or password can not be empty',
        }),
      );
    });

    it('do not sign them in, internal server error', async () => {
      const user = {
        username: 'admin',
        password: 'okay',
      };

      jest.spyOn(userService, 'findByUsername')
        .mockRejectedValueOnce(new Error());

      const res = await request(app).post('/login').send(user);

      expect(res.statusCode).toEqual(500);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'login failed.',
        }),
      );
    });

    it('do not sign them in, username field can not be empty', async () => {
      const user = {
        password: 'okay',
      };

      const res = await request(app)
        .post('/login')
        .send(user);

      expect(res.statusCode).toEqual(400);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'username or password can not be empty',
        }),
      );
    });

    it('do not sig them in, username does not exists', async () => {
      const user = {
        username: 'admin2',
        password: 'okay',
      };

      const res = await request(app)
        .post('/login')
        .send(user);

      expect(res.statusCode).toEqual(400);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Incorrect username or password',
        }),
      );
    });

    it('do not sig them in, incorrect password', async () => {
      const user = {
        username: 'admin',
        password: 'okay2',
      };

      const res = await request(app)
        .post('/login')
        .send(user);

      expect(res.statusCode).toEqual(400);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Incorrect username or password',
        }),
      );
    });
  });

  describe('POST/recipes', () => {
    it('it should save new recibe to db', async () => {
      const recipes = {
        name: 'chicken nuggets',
        difficulty: 2,
        vegetarian: true,
      };

      const res = await request(app)
        .post('/recipes')
        .send(recipes)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(201);

      expect(res.body).toEqual(expect.objectContaining({
        success: true,
        data: expect.any(Object),
      }));

      id = res.body.data._id;
    });

    it('it should not save new recibe to db, invalid vegetarian value', async () => {
      const recipe = {
        name: 'chicken nuggets',
        difficulty: 2,
        vegetarian: 'true',
      };

      const res = await request(app)
        .post('/recipes')
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);

      expect(res.body).toEqual(expect.objectContaining({
        success: false,
        message: 'vegetarian field should be boolean',
      }));
    });

    it('it should not save new recibe to db, internal server error', async () => {
      const recipe = {
        name: 'chicken nuggets',
        difficulty: 2,
        vegetarian: true,
      };

      jest.spyOn(recipeService, 'saveRecipes')
        .mockRejectedValueOnce(new Error());

      const res = await request(app)
        .post('/recipes')
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);

      expect(res.body).toEqual(expect.objectContaining({
        success: false,
        message: 'Failed to save recipes!',
      }));
    });

    it('it should not save new recipe to db, empty name field', async () => {
      const recipe = {
        difficulty: 2,
        vegetarian: true,
      };

      const res = await request(app)
        .post('/recipes')
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);

      expect(res.body).toEqual(expect.objectContaining({
        success: false,
        message: 'name field can not be empty',
      }));
    });

    it('it should not save new recipe to db, invalid difficulty field', async () => {
      const recipe = {
        name: 'jollof rice',
        difficulty: '2',
        vegetarian: true,
      };

      const res = await request(app)
        .post('/recipes')
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);

      expect(res.body).toEqual(expect.objectContaining({
        success: false,
        message: 'difficulty field should be a number',
      }));
    });

    it('it should not save new recipe to db, invalid token', async () => {
      const recipe = {
        name: 'chicken nuggets',
        difficulty: 2,
        vegetarian: true,
      };

      const res = await request(app)
        .post('/recipes')
        .send(recipe)
        .set('Authorization', 'Bearer abc');

      expect(res.statusCode).toEqual(403);

      expect(res.body).toEqual(expect.objectContaining({
        message: 'Unauthorized',
      }));
    });
  });

  // test get all recipes
  describe('GET/Recipes', () => {
    it('should retrive all the recipes in DB', async () => {
      const res = await request(app)
        .get('/recipes');

      expect(res.statusCode).toEqual(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });

    it('should not retrive any recipes in DB, internal server error', async () => {
      jest.spyOn(recipeService, 'allRecipes').mockRejectedValueOnce(new Error());

      const res = await request(app)
        .get('/recipes');

      expect(res.statusCode).toEqual(500);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Some error occurred while retrieving recipes.',
        }),
      );
    });
  });

  describe('GET/recipes/:id', () => {
    it('Retrieve a specified recipe in db', async () => {
      const res = await request(app)
        .get(`/recipes/${id}`);

      expect(res.body).toEqual(expect.objectContaining({
        success: true,
        data: expect.any(Object),
      }));
    });

    it('should not retrieve any recipe from db', async () => {
      const res = await request(app)
        .get('/recipes/abc');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(expect.objectContaining({
        success: false,
        message: 'Recipe with id abc does not exist',
      }));
    });

    it('should not retrieve any recipe from db, internal server error', async () => {
      jest.spyOn(recipeService, 'fetchById')
        .mockRejectedValueOnce(new Error());

      const res = await request(app)
        .get('/recipes/abc');

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(expect.objectContaining({
        success: false,
        message: 'Some error occurred while retrieving recipe details.',
      }));
    });
  });

  describe('PATH/recipes/:id', () => {
    it('update the recipe record in db', async () => {
      const recipe = {
        name: 'chicken nuggets',
      };
      const res = await request(app).patch(`/recipes/${id}`).send(recipe).set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });

    it('should not update the recipe in db, invalid difficulty value', async () => {
      const recipe = {
        name: 'jollof rice',
        difficulty: '2',
      };
      const res = await request(app).patch(`/recipes/${id}`).send(recipe).set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'difficulty field should be a number',
        }),
      );
    });

    it('should not update the recipe in db, invalid vegetarian value', async () => {
      const recipe = {
        difficulty: 3,
        vegetarian: 'true',
      };
      const res = await request(app).patch(`/recipes/${id}`).send(recipe).set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'vegetarian field should be boolean',
        }),
      );
    });

    it('should not update the recipe in db, invalid id received', async () => {
      const recipe = {
        difficulty: 3,
      };
      const res = await request(app).patch('/recipes/1111').send(recipe).set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Recipe with id 1111 does not exist',
        }),
      );
    });

    it('should not update the recipe in db, invalid token', async () => {
      const recipe = {
        name: 'chicken nuggets',
      };
      const res = await request(app).patch(`/recipes/${id}`).send(recipe).set('Authorization', 'Bearer 1111');

      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Unauthorized',
        }),
      );
    });

    it('should not update the recipe in db, no update passed', async () => {
      const recipe = {};
      const res = await request(app).patch(`/recipes/${id}`).send(recipe).set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'field should not be empty',
        }),
      );
    });

    it('should not update the recipe in db, internal server error', async () => {
      const recipe = {
        name: 'chicken nuggets',
      };
      jest.spyOn(recipeService, 'fetchByIdAndUpdate').mockRejectedValueOnce(new Error());

      const res = await request(app).patch(`/recipes/${id}`).send(recipe).set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'An error occured while updating recipe',
        }),
      );
    });
  });

  describe('DELETE / recipes/:id', () => {
    it('delete the specified recipe', async () => {
      const res = await request(app).delete(`/recipes/${id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Recipe successfully deleted',
        }),
      );
    });

    it('failed to delete the specified recipe, invalid token', async () => {
      const res = await request(app).delete(`/recipes/${id}`).set('Authorization', 'Bearer 1111');
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Unauthorized',
        }),
      );
    });

    it('failed to delete the specified recipe, internal server error', async () => {
      jest.spyOn(recipeService, 'fetchByIdAndDelete').mockRejectedValueOnce(new Error());

      const res = await request(app).delete(`/recipes/${id}`).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'An error occured while deleting recipe',
        }),
      );
    });
  });
});
