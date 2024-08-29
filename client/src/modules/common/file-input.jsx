import { forwardRef } from "react";
import FormContext from "react-bootstrap/FormContext";

const FileInput = forwardRef(
  (
    {
      bsPrefix,
      type,
      size,
      htmlSize,
      id,
      className,
      isValid = false,
      isInvalid = false,
      plaintext,
      readOnly,
      // Need to define the default "as" during prop destructuring to be compatible with styled-components github.com/react-bootstrap/react-bootstrap/issues/3595
      as: Component = "input",
      ...props
    },
    ref
  ) => {
    const { controlId } = useContext(FormContext);

    return <input type="file"></input>;
  }
);

export default FileInput;
