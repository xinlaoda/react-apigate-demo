import React from 'react';

type Fn = (
  ...args: any[]
) =>
  | void
  | (() => void)
  | ((event: React.ChangeEvent<HTMLTextAreaElement>) => void);


const TextBox: React.FC<{
  name: string;
  value: string;
  placeholder?: string;
  onInputChange?: Fn;
}> = ({ name, placeholder, value, onInputChange }) => {
  return (
    <textarea
      className="flex-grow flex mx-8 my-4 bg-gray-100 border-black border-2 text-sm text-black"
      id={name}
      name={name}
      placeholder={placeholder}
      rows={15}
      value={value}
      onChange={onInputChange}
    />
  );
};

export default TextBox;
