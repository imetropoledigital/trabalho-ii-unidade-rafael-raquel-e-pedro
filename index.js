const express = require("express");
const req = require("express/lib/request");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

mongoose
  .connect("mongodb://127.0.0.1:27017/users", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conexão com MongoDB bem-sucedida!"))
  .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));

function createDynamicSchema(jsonInput) {
  const buildingDynamic = {};
  Object.keys(jsonInput).forEach((key) => {
    if (typeof jsonInput[key] == "string") {
      buildingDynamic[key] = { type: String };
    }
    if (typeof jsonInput[key] == "number") {
      buildingDynamic[key] = Number;
    }
    if (typeof jsonInput[key] == "boolean") {
      buildingDynamic[key] = Boolean;
    }
    if (Array.isArray(jsonInput[key])) {
      buildingDynamic[key] = {
        type: Array,
        items: createDynamicSchema(jsonInput[key][0]) 
      };
    }
    if (typeof jsonInput[key] == "object" && !Array.isArray(jsonInput[key])) {
      buildingDynamic[key] = { type: Object, properties: createDynamicSchema(jsonInput[key]) };
    }
  });
  return buildingDynamic;
}

app.post("/:dynamic", async (req, res) => {
  const { dynamic } = req.params;

  //extraindo os tipos do json da entidade criada
  const schema = createDynamicSchema(req.body);
  const collectionSchema = new mongoose.Schema(schema);
  //books, {"name": "Poor things", "description": "an awesome book"}
  const Entity =
    mongoose.models[dynamic] || mongoose.model(dynamic, collectionSchema);

  try {
    //criando o documento do post inicial
    const collection = new Entity(req.body);
    const savedCollection = await collection.save();

    res.status(201).json(savedCollection);
    console.log(savedCollection);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar entidade" });
    console.log("Erro ao criar entidade");
  }
});

app.get("/:dynamic/:value", async (req, res) => {
  try {
    const { dynamic, value } = req.params;
    let objectId = new mongoose.Types.ObjectId(value);
    const idSearched = await mongoose.connection.db
      .collection(dynamic)
      .findOne({ _id: objectId });
    if (idSearched == null) {
      res.send("Nenhum documento foi encontrado");
    } else {
      console.log(idSearched);
      res.send(idSearched);
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar por id" });
    console.error(error);
  }
});

app.put("/:dynamic/:id", async (req, res) => {
  const { dynamic, id } = req.params;

  //extraindo os tipos do json da entidade criada
  const schema = createDynamicSchema(req.body);
  const collectionSchema = new mongoose.Schema(schema);
  //books, {"name": "Poor things", "description": "an awesome book"}
  const Entity =
    mongoose.models[dynamic] || mongoose.model(dynamic, collectionSchema);

  try {
    const updatedObject = await Entity.findByIdAndUpdate(id, req.body);

    res.send("Documento atualizado" + updatedObject);
    console.log("Documento atualizado" + updatedObject);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar documento" });
    console.error("Erro ao atualizar documento", err);
  }
});
function createFieldsJson(fieldsInput) {
  //name, age => {fields: {name:1}, {age:1}}
  //-name, age => {fields: {name:0}, {age:1}}

  const list = fieldsInput.split(",");
  const buildingFieldsJson = { projection: {} };

  for (value in list) {
    console.log(value);
    if (list[value].indexOf("-") != -1) {
      buildingFieldsJson.projection[
        list[value].substring(1, list[value].length)
      ] = 0;
    } else {
      buildingFieldsJson.projection[list[value]] = 1;
    }
  }
  return buildingFieldsJson;
}
//BuscadaPaginada, Projeção, Listar todas as entidades
app.get("/:dynamic", async (req, res) => {
  const { dynamic } = req.params;
  if (req.query.query == undefined && req.query.fields != undefined) {
    //retornando query com os fields a serem apresentados
    const fields = req.query.fields;
    const fieldsJson = createFieldsJson(fields);

    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const projecao = await mongoose.connection.db
      .collection(dynamic)
      .find({}, fieldsJson)
      .limit(limit)
      .skip(skip)
      .toArray();

    if (projecao.length == 0) {
      res.send("Nenhum elemento retornado");
    } else {
      const everyItem = [];
      for (index in projecao) {
        console.log(projecao[index]);
        everyItem.push(projecao[index]);
      }
      res.send(everyItem);
    }
  } if(req.query.fields == undefined && req.query.query != undefined) {
    try {
      const query = req.query.query ? JSON.parse(req.query.query) : {};
      const limit = parseInt(req.query.limit) || 10;
      const skip = parseInt(req.query.skip) || 0;

      const buscaPaginada = await mongoose.connection.db
        .collection(dynamic)
        .find(query)
        .limit(limit)
        .skip(skip)
        .toArray();

      if (buscaPaginada.length == 0) {
        res.send("Nenhum elemento retornado");
      } else {
        const everyItem = [];
        for (index in buscaPaginada) {
          console.log(buscaPaginada[index]);
          everyItem.push(buscaPaginada[index]);
        }
        res.send(everyItem);
      }
    } catch (err) {
      res.status(500).json({ err });
      console.error(err);
    }
  }
  if(req.query.fields == undefined && req.query.query == undefined){
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const buscaPaginada = await mongoose.connection.db
      .collection(dynamic)
      .find({})
      .limit(limit)
      .skip(skip)
      .toArray();

    if (buscaPaginada.length == 0) {
      res.send("Nenhum elemento retornado");
    } else {
      const everyItem = [];
      for (index in buscaPaginada) {
        console.log(buscaPaginada[index]);
        everyItem.push(buscaPaginada[index]);
      }
      res.send(everyItem);
    }
  }
}
);

const port = 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});