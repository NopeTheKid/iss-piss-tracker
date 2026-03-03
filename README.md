# ISS Urine Tank Monitor

An interactivereact web application that displays real-time telemetry from the International Space Station, specifically visualizing the **Urine Tank Quantity** level using a beaker component.

## Data Source

This application uses the public ISS Live Lightstreamer API to stream real-time telemetry data.
- **Service URL:** `https://push.lightstreamer.com`
- **Adapter Set:** `ISSLIVE`
- **Urine Tank Quantity ID:** `NODE3000005`

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Running the Application

This project is containerized for easy deployment.

### Development & Production Build

To build and run the application:

```bash
docker compose up --build
```

The application will be available at [http://localhost:8080](http://localhost:8080).

To stop the application:

```bash
docker compose down
```

## Project Structure

- `src/App.jsx`: Main application logic connecting to Lightstreamer.
- `src/components/Beaker.jsx`: Reusable beaker visualization component.
- `src/components/Beaker.css`: Styles for the beaker and liquid animation.
- `Dockerfile`: Multi-stage Docker build process (Node.js build -> Nginx serve).
- `docker-compose.yml`: Service orchestration.

## License

MIT

<!-- original content below this line -->

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
