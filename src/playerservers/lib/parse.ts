
function parseCookie(cookie: string): any {
  const list = {}
  cookie.split(';').forEach(function (cookie) {
    const parts = cookie.split('=') as any
    list[parts.shift().trim()] = decodeURI(parts.join('='))
  })
  return list
}

function stringifyCookie(cookie: object): string {
  let string = ''
  for (const key in cookie) {
    string += `${key}=${cookie[key]}; `
  }
  console.log(string);
  
  return string
}

export {
  parseCookie,
  stringifyCookie,
}