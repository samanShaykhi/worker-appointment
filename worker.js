// worker.js
console.log("🔥 Worker started");

const { Worker, tryCatch } = require("bullmq");
const mongoose = require("mongoose");
const Appointment = require("./models/appointment");
const path = require("path");
const Reservation = require("./models/reservation");
const Consultant = require("./models/consultant");
const Comment = require("./models/comment");
const Notification = require("./models/notification");
require('dotenv').config({ path: path.resolve(__dirname, './config/index.env') })

const connection = { host: "127.0.0.1", port: 6379 };

mongoose.connect(process.env.MONGO_CONECTION)
    .then(() => console.log("✅ Mongo connected (worker)"))
    .catch(err => console.error("❌ Mongo error", err));

new Worker(
    "delete-collection",
    async job => {
        const { id } = job.data;

        console.log("🧨 deleting appointment:", id);

        const res = await Appointment.findByIdAndDelete(id);

        console.log("🗑 delete result:", res);
    },
    { connection }
);
new Worker(
    "delete-collection-reserve",
    async job => {
        try {
            const { id } = job.data;

            if (!id) return
            const DeleteResrve = await Reservation.findByIdAndDelete(id);
            if (!DeleteResrve) return
            const findConsultant = await Consultant.findById(DeleteResrve.consoltant)
            if (!findConsultant) return
            if (!findConsultant.numberClients) {
                findConsultant.numberClients = 1
            } else {
                findConsultant.numberClients = findConsultant.numberClients + 1
            }
            await findConsultant.save()
            //  Add Comment From User
            const Numbermeeting = await Comment.countDocuments({ creatorId: DeleteResrve.user, consultantId: findConsultant._id })
            await Comment.create({
                creator: DeleteResrve.userCreator,
                creatorId: DeleteResrve.user,
                consultant: { firstName: findConsultant.firstName, lastName: findConsultant.lastName, image: findConsultant.image },
                consultantId: findConsultant._id,
                meeting: Numbermeeting + 1
            })
            //  Add Comment From User
            // Add Not
            await Notification.create({
                text: `لطفا دیدگاه خودتو نسبت به جلسه مشاور دکتر ${findConsultant.firstName} ${findConsultant.lastName} با ما درمیون بزار`,
                user: DeleteResrve.user,
                link: `${findConsultant._id}`
            })
            // Add Not
            console.log(id)
        } catch (error) {
            console.log(error)
        }
    },
    { connection }
);
