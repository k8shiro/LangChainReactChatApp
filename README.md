docker build -t lc-python -f python/Dockerfile .
docker run --rm -it -e OPENAI_API_KEY=${OPENAI_API_KEY} -v $(pwd)/python:/python lc-python bash
docker run --rm -it -e OPENAI_API_KEY=${OPENAI_API_KEY} -v $(pwd)/python:/python -p 8080:8080 lc-python python app.py

docker build -t lc-react -f react/Dockerfile .
docker run --rm -it -v $(pwd)/react:/react lc-react bash
docker run --rm -it -p 5173:5173 -v $(pwd)/react:/react lc-react bash -c "cd app && yarn install"
docker run --rm -it -p 5173:5173 -v $(pwd)/react:/react -e VITE_API_ENDPOINT=http://localhost:8080 lc-react bash -c "cd app && yarn dev --host 0.0.0.0"