import Spinner from "react-bootstrap/Spinner";
import classNames from "classnames";

export default function Loader({ children, fullscreen, className }) {
  return (
    <div
      className={classNames(
        "d-flex flex-column align-items-center justify-content-center w-100 h-100 top-0 start-0",
        className || "o-75  bg-white"
      )}
      style={{ zIndex: 9999, position: fullscreen ? "fixed" : "absolute" }}>
      <div className="text-center">
        <Spinner variant="primary" animation="border" role="status" />
        <div>{children || "Loading"}</div>
      </div>
    </div>
  );
}
