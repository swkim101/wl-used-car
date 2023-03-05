const puppeteer = require('puppeteer-core');
const axios = require('axios');
const fs = require('fs');
const db = fs.readFileSync("./db")
require('dotenv').config()

// :: string -> boolean
const isJapaneseCar = title =>
  /toyota/i.test(title) || /honda/i.test(title) || /nissan/i.test(title) ||
  /acura/i.test(title) || /lexus/i.test(title)

// :: string -> boolean
const isNew = title => {
  const titles = JSON.parse(db)
  return !titles.includes(title)
}

// :: [string] -> nil
const saveTitles = titles => {
  fs.writeFileSync("./db", JSON.stringify(titles))
}


const addr = `https://tippecanoe.craigslist.org/search/cta?max_price=7800&min_price=4000#search=1~gallery~0~0`;

//
(async () => {
  const browser = await await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
  });
  const page = await browser.newPage();
  await page.goto(addr);
  await page.setViewport({width: 1080, height: 1024});

  const titlestringSelector = '.titlestring';
  await page.waitForSelector(titlestringSelector);

  var title = await page.evaluate(() => [
    ...document.querySelectorAll(".titlestring")
  ].map(e => e.innerHTML))
  var href = await page.evaluate(() => [
    ...document.querySelectorAll(".titlestring")
  ].map(e => e.href))
  var price = await page.evaluate(() => [
    ...document.querySelectorAll(".priceinfo")
  ].map(e => e.innerHTML))

  let cnt = 1;
  let text = ""
  let newCarPosted = false
  for (let i = 0; i < title.length; i++) {
    if (!isJapaneseCar(title[i])) {
      continue
    }
    const isnew = isNew(title[i])
    const n = isnew ? "🆕 " : ""
    newCarPosted = newCarPosted || isnew
    text += `${n}${cnt}) ${price[i]}\t${title[i]}\n`
    text += `${href[i]}\n`
    cnt++
  }

  if (newCarPosted) {
    text += `${process.env.NOTIFY_TO} new car(s)!\n`
    console.log(text)
    axios.post(`${process.env.WEBHOOK_URL}`,
      { text }
    )
    saveTitles(title)
  } else {
    const hours = (new Date()).getHours()
    if (10 < hours &&  hours < 23) {
      axios.post(`${process.env.WEBHOOK_URL}`,
        { text: "no new car" }
      )
    }
  }
  
  await browser.close();
})();
