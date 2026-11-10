const target = document.querySelector('#photo-sources');

function link(url, label) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.textContent = label;
  return anchor;
}

try {
  const response = await fetch(new URL('./images/credits.json', import.meta.url));
  if (!response.ok) throw new Error('Photo credits unavailable');
  const credits = await response.json();
  for (const [id, credit] of Object.entries(credits)) {
    const article = document.createElement('article');
    article.id = id;
    const title = document.createElement('h2');
    title.textContent = credit.alt;
    const info = document.createElement('p');
    info.append(link(credit.source, credit.title), ` · ${credit.author} · `, link(credit.licenseUrl, credit.license));
    const changes = document.createElement('p');
    changes.textContent = credit.changes;
    article.append(title, info, changes);
    target.append(article);
  }
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
} catch {
  target.textContent = '사진 출처를 불러오지 못했습니다.';
}
