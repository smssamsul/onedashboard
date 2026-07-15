const https = require('https');
const fs = require('fs');
const path = require('path');

// Try 'main' branch as well, and CSV source
const alternatives = [
    { url: 'https://raw.githubusercontent.com/ibnux/data-indonesia/master/csv/kecamatan.csv', type: 'csv' },
    { url: 'https://raw.githubusercontent.com/ibnux/data-indonesia/main/csv/kecamatan.csv', type: 'csv' },
    { url: 'https://raw.githubusercontent.com/mkhstar/indonesia-wilayah-json/main/data/districts.json', type: 'json' },
    { url: 'https://raw.githubusercontent.com/edyprasetyo/indonesia-region/main/data/districts.json', type: 'json' },
    { url: 'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/main/static/api/districts.json', type: 'json' }
];

function fetchFile(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`Trying to fetch from: ${url}`);
        https.get(url, (response) => {
            /*
              GitHub Raw usually returns 200 directly. 
              If 301/302, we follow.
            */
            if (response.statusCode === 200) {
                if (dest.endsWith('.json') && url.endsWith('.json')) {
                    // Direct JSON stream
                    const file = fs.createWriteStream(dest);
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close(() => {
                            console.log('Download completed successfully!');
                            resolve(true);
                        });
                    });
                } else {
                    // Memory buffer for CSV
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        resolve(data);
                    });
                }
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                console.log(`Redirecting to: ${response.headers.location}`);
                fetchFile(response.headers.location, dest).then(resolve).catch(reject);
            } else {
                console.log(`Failed with status code: ${response.statusCode}`);
                resolve(false);
            }
        }).on('error', (err) => {
            console.error(`Error: ${err.message}`);
            resolve(false);
        });
    });
}

function parseCsvToJson(csvData) {
    // Expected format: code,district_name,regency_code,...
    // Ibnux format: id,id_kabupaten,nama
    const lines = csvData.split('\n');
    const result = [];
    const startIndex = 1; // Skip header

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length >= 3) {
            // Ibnux standard: id, regency_id, name
            result.push({
                id: parts[0].replace(/"/g, ''),
                regency_id: parts[1].replace(/"/g, ''),
                name: parts[2].replace(/"/g, '').toUpperCase(),
                // Placeholder attributes to match our previous schema if needed
                kecamatan: parts[2].replace(/"/g, '').toUpperCase(),
                kota: "", // We don't have city name in this simplified CSV, will need another map if critical, but for search it's okay
                provinsi: ""
            });
        }
    }
    return result;
}

async function main() {
    const destPath = path.resolve(__dirname, 'src/data/indonesia-districts.json');

    // Ensure directory exists
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    for (const item of alternatives) {
        // If asking for json, we stream directly to destPath
        // If CSV, we ignore destPath argument for stream and handle buffer
        const result = await fetchFile(item.url, item.type === 'json' ? destPath : 'ignore');

        if (result === true && item.type === 'json') {
            console.log(`Successfully downloaded districts JSON to ${destPath}`);
            return;
        } else if (typeof result === 'string') {
            // CSV downloaded, parse it
            console.log('CSV downloaded, parsing to JSON...');
            try {
                const jsonData = parseCsvToJson(result);
                if (jsonData.length > 500) {
                    fs.writeFileSync(destPath, JSON.stringify(jsonData, null, 2));
                    console.log(`Successfully converted CSV to JSON with ${jsonData.length} items.`);
                    return;
                } else {
                    console.log('Parsed data too small, invalid?');
                }
            } catch (e) {
                console.error('Error parsing CSV', e);
            }
        }
    }

    console.error('All download attempts failed.');
    // Fallback data
    const fallbackData = [
        { "id": "1", "kecamatan": "Gambir", "kota": "Jakarta Pusat", "provinsi": "DKI Jakarta" }
    ];
    fs.writeFileSync(destPath, JSON.stringify(fallbackData, null, 2));
    console.log('Created fallback file.');
}

main();
