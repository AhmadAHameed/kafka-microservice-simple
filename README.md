# kafka-microservice-simple

https://github.com/AhmadAHameed/kafka-microservice-simple/assets/54976760/17081fe8-e7b3-44e7-8e75-fd77eff31133

this is a simple **kafka** project, using 2 microservices that communicate with each other
the first microservice uses **python** as backend, while the second uses **node.js**

## Installation
Check the docker-compose.yml file and check if you want to use it with a localhost or with an online server.

after that, run the following command:
`docker-compose up --build`

## Starting the mircoservices:
### Starting App1 (Python Backend)
- Navigate to app1 folder
`cd app1`
- Create virtual env or conda env
`conda create -n kafka_venv python=3.10`
- Install libraries
`pip install -r requirements.txt`
- Run python microservice (App1)
`uvicorn app1:app --host localhost --port 8005`

### Starting App2 (Node.js Backend)
- Navigate to app2 folder
`cd app2` or `cd ../app2` if you were in the path of app1 directory
- Initialize the project
`npm init -y`
- Install Dependencies
`npm install express ini fs path ejs body-parser kafka-node`
- (Optionally) edit the port used to any port you want, `const PORT = 8006`
- Run node.js microservice (App2) `node app2.js`

Start communication between the two microservices
