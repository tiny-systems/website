FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go run . && test -f dist/io/index.html && test -f dist/dev/index.html

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY redirects.inc /etc/nginx/conf.d/redirects.inc
COPY common.inc /etc/nginx/conf.d/common.inc
COPY --from=build /src/dist /site
EXPOSE 8080
