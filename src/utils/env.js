const isPlaceholder = (value) => /YOUR_|REPLACE_|[<>]/i.test(value);

export const requireEnv = (name) => {
  const value = process.env[name];
  if (!value?.trim() || isPlaceholder(value)) {
    throw new Error(`Set ${name} to a non-placeholder value in your environment`);
  }
  return value;
};

export const validateUrl = (name, value, protocols = ['http:', 'https:']) => {
  try {
    if (!value?.trim() || isPlaceholder(value) || !/^[a-z]+:\/\//i.test(value.trim())) {
      throw new Error();
    }
    const url = new URL(value.trim());
    const hostname = url.hostname.replace(/\.$/, '');
    if (!protocols.includes(url.protocol) || !url.hostname ||
        hostname === 'example.invalid' || hostname.endsWith('.example.invalid')) {
      throw new Error();
    }
    return value.trim();
  } catch {
    throw new Error(`Set ${name} to a valid ${protocols.map(p => p.slice(0, -1)).join('/')} URL`);
  }
};

export const readHttpUrl = (name) => validateUrl(name, requireEnv(name));
