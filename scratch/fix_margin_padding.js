const fs = require('fs');
const path = require('path');

const componentsDir = 'd:/laragon/www/one_dashboard/frontend-tp/src/app/sales/products/addProducts3/components';

fs.readdirSync(componentsDir).forEach(file => {
    if (file.endsWith('.js')) {
        const filePath = path.join(componentsDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // We need to find InputNumber components that are for margin or padding and change their min={0} to min={-9999}
        // A simple way is to use regex. Since JSX spans multiple lines, we can look for `value={padding...}` or `value={margin...}` followed by `min={0}`.
        const regex = /(value=\{padding[A-Za-z]+\}|value=\{margin[A-Za-z]+\})([\s\S]*?)min=\{0\}/g;
        let modified = false;
        
        let newContent = content.replace(regex, (match, p1, p2) => {
            modified = true;
            return `${p1}${p2}min={-9999}`;
        });

        // Some might use onValueChange instead, e.g. onValueChange={(e) => setPaddingTop(e.value || 0)}
        // We should also replace e.value || 0 to e.value ?? 0 so that 0 works, but wait, `e.value || 0` will turn `0` into `0`, but what if it's `null`? `e.value ?? 0` is better because `||` treats `0` as falsy, but `0 || 0` is `0`, which is fine. But what if it's `null`? `null || 0` is `0`. What if it's `-5`? `-5 || 0` is `-5`. So `|| 0` is okay! Wait, what if the user deletes the value, it becomes null, and it reverts to 0. That's fine.
        
        // Let's also check for SectionComponent which has `marginBetween`
        const regexMarginBetween = /(value=\{marginBetween\})([\s\S]*?)min=\{0\}/g;
        newContent = newContent.replace(regexMarginBetween, (match, p1, p2) => {
            modified = true;
            return `${p1}${p2}min={-9999}`;
        });

        if (modified) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated ${file}`);
        }
    }
});
